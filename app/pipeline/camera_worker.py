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
from app.modules.night_detection import process_night_check
from app.modules.zone_intrusion import process_detection
from app.utils.logger import get_logger
from app.utils.paths import CONFIG_DIR

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
        self.plate_voter = PlateVoter()
        # A voter returns the finalized mode on every later valid read. A latch
        # makes one finalized plate produce one event/alert per track incident.
        self._finalized_plates: dict[str, set[str]] = {}
        self._active_track_ids: set[str] = set()
        self.zones = self._load_zones()
        self.thresholds = self._load_thresholds()

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

        for detection in detections:
            for zone in camera_zones:
                event, _ = process_detection(
                    detection,
                    self.camera_id,
                    str(zone["zone_id"]),
                    zone["polygon"],
                    self.incident_tracker,
                    frame_threshold,
                    self.event_store,
                    self.alert_manager,
                    frame,
                )
                inside = bool(event.metadata.get("inside_zone"))
                process_night_check(
                    detection.track_id,
                    self.camera_id,
                    str(zone["zone_id"]),
                    inside,
                    self.incident_tracker,
                    night_seconds,
                    self.event_store,
                    self.alert_manager,
                    start_hour=night_start,
                    end_hour=night_end,
                )

            if detection.class_name.lower() not in VEHICLE_CLASSES:
                continue

            crop = self.plate_detector.detect(frame, detection.bbox)
            reads = read_plate(crop)
            for read in reads:
                plate = self.plate_voter.add_read(detection.track_id, read)
                if not plate:
                    continue

                finalized = self._finalized_plates.setdefault(detection.track_id, set())
                if plate in finalized:
                    continue
                finalized.add(plate)

                event = self.event_store.save_event(
                    Event(
                        track_id=detection.track_id,
                        camera_id=self.camera_id,
                        event_type="vehicle_plate",
                        timestamp=datetime.now(timezone.utc),
                        metadata={"plate": plate, "bbox": list(detection.bbox)},
                    )
                )
                if self.alert_manager.is_restricted(plate):
                    self.alert_manager.create_alert_from_event(
                        event,
                        "restricted_vehicle",
                        "high",
                    )

    def _clear_finished_tracks(self, detections: list[Detection]) -> None:
        """Drop plate state for tracks no longer present in the current frame."""
        active_tracks = {detection.track_id for detection in detections}
        for track_id in list(self._finalized_plates):
            if track_id not in active_tracks:
                self._finalized_plates.pop(track_id, None)
                self.plate_voter.clear(track_id)
                self.incident_tracker.reset_track(track_id)

    def run(self) -> None:
        reader = LatestFrameReader(self.source).start()
        # A source can reach EOF between start() and this check. If at least one
        # frame arrived, still process it; otherwise treat the source as offline.
        self.online = reader.is_open or reader.frame_sequence > 0
        if not self.online:
            return

        last_sequence = -1
        try:
            while not self.stop_requested:
                frame = reader.get()
                sequence = reader.frame_sequence
                if frame is None or sequence == last_sequence:
                    if reader.finished:
                        break
                    time.sleep(0.005)
                    continue

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
