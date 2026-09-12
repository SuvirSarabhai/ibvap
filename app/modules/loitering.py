"""Persistent person presence (loitering) detection."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from app.events.schema import Event
from app.modules.authorization import authorization_reason, check_authorization
from app.modules.zone_intrusion import check_zone
from app.utils.image_utils import save_evidence_snapshot


def process_loitering(
    detection,
    camera_id: str,
    zone_id: str,
    zone_polygon: list[list[float]],
    tracker,
    loiter_threshold_seconds: float,
    event_store=None,
    alert_manager=None,
    frame=None,
    face_match_result: dict[str, Any] | None = None,
    face_matcher: Callable | None = None,
    authorization_checker: Callable = check_authorization,
    event_description: str | None = None,
    event_type_label: str | None = "Loitering",
    confidence: float | None = None,
):
    inside = check_zone(detection.track_id, detection.bbox, zone_polygon)
    promoted = tracker.check_persistence(
        detection.track_id,
        f"loitering:{zone_id}",
        inside,
        time_threshold=float(loiter_threshold_seconds),
    )
    if not promoted:
        return None, None

    matched = face_match_result
    if matched is None and face_matcher:
        matched = face_matcher(detection.track_id, frame, detection.bbox)
    authorization = authorization_checker(detection.track_id, zone_id, matched)
    evidence = save_evidence_snapshot(frame, detection.bbox, "loitering", detection.track_id)
    reason = authorization_reason(authorization["outcome"])
    event = Event(
        track_id=detection.track_id,
        camera_id=camera_id,
        event_type="loitering",
        zone_id=zone_id,
        timestamp=datetime.now(timezone.utc),
        metadata={
            "inside_zone": inside,
            "bbox": list(detection.bbox),
            "authorization_outcome": authorization["outcome"],
            "person_id": authorization["person_id"],
        },
        evidence_path=evidence,
        event_description=reason or event_description or f"Person loitering in {zone_id}",
        event_type_label=event_type_label,
        entity_type="person",
        confidence=confidence,
        severity="high" if authorization["outcome"] != "authorized" else "normal",
    )
    alert = None
    if event_store:
        event = event_store.save_event(event)
    if alert_manager and authorization["outcome"] != "authorized":
        alert = alert_manager.create_alert_from_event(event, "loitering", "high")
    return event, alert


__all__ = ["process_loitering"]
