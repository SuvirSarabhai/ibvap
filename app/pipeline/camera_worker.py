"""Per-camera frame, detection, analytics, and visualization loop."""

from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import cv2
import yaml

from app.core.detector import Detection, ObjectDetector
from app.core.frame_reader import LatestFrameReader
from app.core.incident_tracker import IncidentTracker
from app.events.alert_manager import AlertManager
from app.events.event_store import EventStore
from app.events.schema import Event
from app.modules.anpr.ocr import read_plate
from app.modules.anpr.plate_detector import PlateDetector
from app.modules.anpr.voting import PlateVoter
from app.modules.face_recognition import match_face
from app.modules.loitering import process_loitering
from app.modules.night_detection import process_night_check
from app.modules.vehicle_behavior import VehicleBehaviorState, process_vehicle_behavior
from app.modules.zone_intrusion import process_detection
from app.core.track_history import TrackHistory
from app.utils.demo_profiles import apply_demo_profile
from app.utils.image_utils import save_evidence_snapshot
from app.utils.logger import get_logger


ANPR_REASON = "Restricted plate match"
VEHICLE_DWELL_REASON = "Vehicle dwell in sensitive zone"
from app.utils.paths import CONFIG_DIR, REPOSITORY_ROOT

logger = get_logger(__name__)
VEHICLE_CLASSES = {"car", "motorcycle", "bus", "truck"}


class CameraWorker:
    def __init__(
        self,
        camera_id: str,
        source: str | Path,
        detector: Optional[ObjectDetector] = None,
        show_window: bool = True,
        on_detections: Optional[Callable[[str, object, list[Detection]], None]] = None,
        incident_tracker: IncidentTracker | None = None,
        event_store: EventStore | None = None,
        alert_manager: AlertManager | None = None,
    ):
        self.camera_id = camera_id
        self.source = str(source)
        self.detector = detector or ObjectDetector()
        self.show_window = show_window
        self.on_detections = on_detections
        self.stop_requested = False
        self.online = False
        self.incident_tracker = incident_tracker or IncidentTracker()
        self.event_store = event_store or EventStore()
        self.alert_manager = alert_manager or AlertManager()
        self.plate_detector = PlateDetector()
        self.thresholds = apply_demo_profile(self._load_thresholds())
        self.plate_voter = PlateVoter(
            plate_format=self.thresholds.get("plate_format", "generic"),
            fragment_window_seconds=self.thresholds.get("plate_fragment_window_seconds", 2.0),
        )
        # A voter returns the finalized mode on every later valid read. A latch
        # makes one finalized plate produce one event/alert per track incident.
        self._finalized_plates: dict[str, set[str]] = {}
        self._active_track_ids: set[str] = set()
        self._snapped_tracks: set[str] = set()  # track_ids we've already snapped
        # Throttle base detection events: one per track_id per N seconds
        self._last_detection_time: dict[str, float] = {}
        self._detection_interval_s: float = 30.0
        self.track_history = TrackHistory()
        self.vehicle_behavior_state = VehicleBehaviorState()
        self.zones = self._load_zones()

    def _load_zones(self) -> list[dict]:
        try:
            with (CONFIG_DIR / "zones.yaml").open(encoding="utf-8") as config_file:
                return (yaml.safe_load(config_file) or {}).get("zones", [])
        except (OSError, yaml.YAMLError):
            logger.exception("Could not load zone configuration")
            return []

    def _load_thresholds(self) -> dict:
        try:
            with (CONFIG_DIR / "thresholds.yaml").open(encoding="utf-8") as config_file:
                return yaml.safe_load(config_file) or {}
        except (OSError, yaml.YAMLError):
            logger.exception("Could not load threshold configuration")
            return {}

    def stop(self) -> None:
        self.stop_requested = True

    def _handle_detections(self, frame, detections: list[Detection]) -> None:
        camera_zones = [zone for zone in self.zones if zone.get("camera_id") == self.camera_id]
        frame_threshold = int(self.thresholds.get("zone_intrusion_frames", 5))
        night_seconds = float(self.thresholds.get("night_duration_seconds", 5))
        night_start = int(self.thresholds.get("night_start_hour", 20))
        night_end = int(self.thresholds.get("night_end_hour", 6))
        loiter_seconds = float(self.thresholds.get("loiter_threshold_seconds", 15))
        default_dwell_seconds = float(self.thresholds.get("dwell_threshold_seconds", 15))
        default_speed = float(self.thresholds.get("moving_speed_threshold", 5))

        for detection in detections:
            class_name = detection.class_name.lower()
            is_vehicle = class_name in VEHICLE_CLASSES
            is_person = class_name == "person"
            entity_type = "vehicle" if is_vehicle else "person" if is_person else None

            # Skip uninteresting classes (e.g. dog, bicycle — not our concern)
            if entity_type is None:
                continue

            # ── 1. Base detection event — throttled to once per track per 30 s ──
            self._active_track_ids.add(detection.track_id)
            now = time.monotonic()
            last = self._last_detection_time.get(detection.track_id, 0.0)
            should_log = (now - last) >= self._detection_interval_s

            snap_path = None
            if is_vehicle and detection.track_id not in self._snapped_tracks:
                # Save one snapshot per track (first time we see this vehicle)
                from uuid import uuid4
                snap_path = save_evidence_snapshot(frame, detection.bbox, "detection", detection.track_id)
                if snap_path:
                    self._snapped_tracks.add(detection.track_id)

            if should_log:
                self._last_detection_time[detection.track_id] = now
                self.event_store.save_event(
                    Event(
                        track_id=detection.track_id,
                        camera_id=self.camera_id,
                        event_type="detection",
                        timestamp=datetime.now(timezone.utc),
                        metadata={"class": class_name, "bbox": list(detection.bbox)},
                        event_description=f"{detection.class_name.title()} detected",
                        event_type_label="Detections",
                        entity_type=entity_type,
                        confidence=detection.confidence,
                        severity="normal",
                        evidence_path=snap_path,
                    )
                )

            # ── 2. Border-zone analytics ──
            for zone in camera_zones:
                zone_id = str(zone["zone_id"])
                if is_person:
                    event_description = f"Person in zone — {self.camera_id}"
                    matched = match_face(detection.track_id, frame, detection.bbox)
                    event, _ = process_detection(
                        detection, self.camera_id, zone_id, zone["polygon"],
                        self.incident_tracker, frame_threshold, self.event_store,
                        self.alert_manager, frame,
                        event_description=event_description,
                        event_type_label="Zone Entry", entity_type=entity_type,
                        confidence=detection.confidence, severity="high",
                        face_match_result=matched,
                    )
                    inside = bool(event.metadata.get("inside_zone"))
                    process_night_check(
                        detection.track_id, self.camera_id, zone_id, inside,
                        self.incident_tracker, night_seconds, self.event_store,
                        self.alert_manager, start_hour=night_start, end_hour=night_end,
                        event_description=event_description,
                        event_type_label="Night Movement", entity_type=entity_type,
                        confidence=detection.confidence, frame=frame,
                        bbox=detection.bbox, face_match_result=matched,
                    )
                    process_loitering(
                        detection, self.camera_id, zone_id, zone["polygon"],
                        self.incident_tracker, float(zone.get("loiter_threshold_seconds", loiter_seconds)),
                        self.event_store, self.alert_manager, frame,
                        face_match_result=matched, confidence=detection.confidence,
                    )
                elif is_vehicle:
                    process_vehicle_behavior(
                        detection, self.camera_id, zone, self.track_history,
                        self.incident_tracker, self.vehicle_behavior_state,
                        self.event_store, self.alert_manager, frame,
                        is_restricted=self.alert_manager.is_restricted,
                        dwell_threshold_seconds=float(zone.get("dwell_threshold_seconds", default_dwell_seconds)),
                        moving_speed_threshold=float(zone.get("moving_speed_threshold", default_speed)),
                    )

            # ── 3. ANPR — vehicles only ──
            if not is_vehicle:
                continue

            crop = self.plate_detector.detect(frame, detection.bbox)
            reads = read_plate(crop, camera_id=self.camera_id, track_id=detection.track_id)
            for read in reads:
                plate = self.plate_voter.add_read(detection.track_id, read)
                if not plate:
                    continue

                finalized = self._finalized_plates.setdefault(detection.track_id, set())
                if plate in finalized:
                    continue
                finalized.add(plate)

                restricted = self.alert_manager.is_restricted(plate)
                evidence_path = save_evidence_snapshot(
                    frame, detection.bbox, "anpr", detection.track_id
                )
                event = self.event_store.save_event(
                    Event(
                        track_id=detection.track_id,
                        camera_id=self.camera_id,
                        event_type="vehicle_plate",
                        timestamp=datetime.now(timezone.utc),
                        metadata={
                            "plate": plate,
                            "bbox": list(detection.bbox),
                            "restricted": restricted,
                        },
                        evidence_path=evidence_path,
                        event_description=ANPR_REASON if restricted else f"License plate detected — {plate}",
                        event_type_label="Restricted Plate" if restricted else "ANPR",
                        entity_type="vehicle",
                        confidence=detection.confidence,
                        severity="high" if restricted else "normal",
                    )
                )
                if restricted:
                    self.alert_manager.create_alert_from_event(
                        event,
                        "restricted_vehicle",
                        "high",
                    )


    def _clear_finished_tracks(self, detections: list[Detection]) -> None:
        """Drop plate state for tracks no longer present in the current frame."""
        active_tracks = {detection.track_id for detection in detections}
        known_tracks = set(self._active_track_ids)
        for track_id in known_tracks - active_tracks:
            self._finalized_plates.pop(track_id, None)
            self.plate_voter.clear(track_id)
            self.incident_tracker.reset_track(track_id)
            self.track_history.clear(track_id)
            self.vehicle_behavior_state.clear(track_id)
            self._last_detection_time.pop(track_id, None)
        self._active_track_ids = active_tracks
        self._snapped_tracks.intersection_update(active_tracks)

    def run(self) -> None:
        reader = LatestFrameReader(self.source).start()
        # A source can reach EOF between start() and this check. If at least one
        # frame arrived, still process it; otherwise treat the source as offline.
        self.online = reader.is_open or reader.frame_sequence > 0
        if not self.online:
            return

        last_sequence = -1
        last_loop = 0
        try:
            while not self.stop_requested:
                frame = reader.get()
                sequence = reader.frame_sequence
                if frame is None or sequence == last_sequence:
                    if reader.finished:
                        break
                    time.sleep(0.005)
                    continue

                # Detect video loop and reset per-session state
                current_loop = reader.loop_count
                if current_loop != last_loop:
                    last_loop = current_loop
                    self._snapped_tracks.clear()
                    self._last_detection_time.clear()
                    self._finalized_plates.clear()
                    self._active_track_ids.clear()
                    self.track_history.clear()
                    self.vehicle_behavior_state.clear()
                    self.plate_voter.clear_all()
                    logger.info("Video looped (%d) — state reset for %s", current_loop, self.camera_id)

                last_sequence = sequence
                detections = self.detector.detect_and_track(frame)
                if self.on_detections:
                    self.on_detections(self.camera_id, frame, detections)
                self._handle_detections(frame, detections)
                self._clear_finished_tracks(detections)

                annotated = draw_detections(frame, detections)
                if self.show_window:
                    cv2.imshow(f"IBVAP - {self.camera_id}", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        self.stop_requested = True
        except Exception:
            logger.exception("Camera worker failed: %s", self.camera_id)
        finally:
            reader.stop()
            self.online = False
            if self.show_window:
                cv2.destroyWindow(f"IBVAP - {self.camera_id}")



def draw_detections(frame, detections: list[Detection]):
    annotated = frame.copy()
    for detection in detections:
        x1, y1, x2, y2 = detection.bbox
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 0), 2)
        label = f"{detection.class_name} #{detection.track_id} {detection.confidence:.2f}"
        cv2.putText(
            annotated,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 220, 0),
            2,
            cv2.LINE_AA,
        )
    return annotated


def run_camera(
    source: str | Path,
    camera_id: str = "camera-1",
    show_window: bool = True,
) -> None:
    CameraWorker(camera_id, source, show_window=show_window).run()
