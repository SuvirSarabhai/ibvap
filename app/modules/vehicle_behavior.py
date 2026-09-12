"""Specific vehicle stop/dwell behavior near sensitive border zones."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.events.schema import Event
from app.modules.zone_intrusion import check_zone
from app.utils.image_utils import save_evidence_snapshot


class VehicleBehaviorState:
    def __init__(self):
        self.stop_confirmed: set[tuple[str, str]] = set()
        self.best_frame: dict[tuple[str, str], tuple[float, Any, tuple[int, int, int, int]]] = {}

    def clear(self, track_id: str | None = None):
        if track_id is None:
            self.stop_confirmed.clear()
            self.best_frame.clear()
            return
        for key in list(self.stop_confirmed):
            if key[0] == str(track_id):
                self.stop_confirmed.discard(key)
        for key in list(self.best_frame):
            if key[0] == str(track_id):
                self.best_frame.pop(key, None)


def process_vehicle_behavior(
    detection,
    camera_id: str,
    zone: dict,
    track_history,
    tracker,
    state: VehicleBehaviorState,
    event_store=None,
    alert_manager=None,
    frame=None,
    plate: str | None = None,
    is_restricted=None,
    dwell_threshold_seconds: float = 15.0,
    moving_speed_threshold: float = 5.0,
):
    zone_id = str(zone["zone_id"])
    if not zone.get("sensitive", False):
        return None, None
    inside = check_zone(detection.track_id, detection.bbox, zone["polygon"])
    if not inside:
        tracker.check_persistence(
            detection.track_id, f"vehicle_stop:{zone_id}", False, time_threshold=dwell_threshold_seconds
        )
        state.clear(detection.track_id)
        return None, None

    x1, y1, x2, y2 = detection.bbox
    speed = track_history.update(detection.track_id, (x1 + x2) / 2, (y1 + y2) / 2)
    stopped = speed <= float(zone.get("moving_speed_threshold", moving_speed_threshold))
    stop_promoted = tracker.check_persistence(
        detection.track_id,
        f"vehicle_stop:{zone_id}",
        stopped,
        time_threshold=float(zone.get("dwell_threshold_seconds", dwell_threshold_seconds)),
    )
    key = (str(detection.track_id), zone_id)
    if stopped:
        best = state.best_frame.get(key)
        if best is None or speed < best[0]:
            state.best_frame[key] = (speed, frame, tuple(detection.bbox))
    if stop_promoted:
        state.stop_confirmed.add(key)
        return None, None
    if not state.stop_confirmed.__contains__(key) or stopped:
        return None, None

    best_frame = state.best_frame.pop(key, None)
    state.stop_confirmed.discard(key)
    evidence_frame = best_frame[1] if best_frame else frame
    evidence_bbox = best_frame[2] if best_frame else detection.bbox
    restricted = bool(plate and is_restricted and is_restricted(str(plate)))
    restricted_zone = str(zone.get("sensitivity", "")).lower() == "high"
    severity = "high" if restricted or restricted_zone else "medium"
    event = Event(
        track_id=detection.track_id,
        camera_id=camera_id,
        event_type="vehicle_dwell_sensitive_zone",
        zone_id=zone_id,
        timestamp=datetime.now(timezone.utc),
        metadata={
            "bbox": list(detection.bbox),
            "speed_image_space": speed,
            "plate": plate,
            "sensitive": True,
        },
        evidence_path=save_evidence_snapshot(
            evidence_frame, evidence_bbox, "vehicle-dwell", detection.track_id
        ),
        event_description="Vehicle dwell in sensitive zone",
        event_type_label="Vehicle Dwell",
        entity_type="vehicle",
        confidence=detection.confidence,
        severity=severity,
    )
    if event_store:
        event = event_store.save_event(event)
    alert = alert_manager.create_alert_from_event(event, "vehicle_dwell_sensitive_zone", severity) if alert_manager else None
    return event, alert


__all__ = ["VehicleBehaviorState", "process_vehicle_behavior"]
