"""Zone intrusion geometry and authorization-gated event promotion."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Iterable

import cv2
import numpy as np

from app.core.detector import Detection
from app.core.incident_tracker import IncidentTracker
from app.events.schema import Event
from app.modules.authorization import authorization_reason, check_authorization
from app.utils.image_utils import save_evidence_snapshot


def check_zone(track_id: str, bbox: Iterable[float], zone_polygon: list[list[float]]) -> bool:
    """Check a track's ground-contact point against a configured polygon.

    The bottom-center of a person/vehicle box is the point where the entity
    meets the ground. Using the bbox center can classify a tall person as
    inside while their feet are still outside a restricted area.
    """
    del track_id
    x1, y1, x2, y2 = bbox
    ground_point = ((float(x1) + float(x2)) / 2, float(y2))
    polygon = np.asarray(zone_polygon, dtype=np.float32).reshape((-1, 1, 2))
    return cv2.pointPolygonTest(polygon, ground_point, False) >= 0


def process_detection(
    detection: Detection,
    camera_id: str,
    zone_id: str,
    zone_polygon: list[list[float]],
    tracker: IncidentTracker,
    frame_threshold: int = 5,
    event_store=None,
    alert_manager=None,
    frame=None,
    event_description: str | None = None,
    event_type_label: str | None = None,
    entity_type: str | None = None,
    confidence: float | None = None,
    severity: str = "normal",
    face_match_result: dict[str, Any] | None = None,
    face_matcher: Callable | None = None,
    authorization_checker: Callable = check_authorization,
):
    """Persist one check and promote only when continuous entry is established."""
    inside = check_zone(detection.track_id, detection.bbox, zone_polygon)
    event = Event(
        track_id=detection.track_id,
        camera_id=camera_id,
        event_type="zone_check",
        zone_id=zone_id,
        timestamp=datetime.now(timezone.utc),
        metadata={"inside_zone": inside, "bbox": list(detection.bbox)},
        event_description=event_description,
        event_type_label=event_type_label,
        entity_type=entity_type,
        confidence=confidence,
        severity=severity,
        evidence_path=save_evidence_snapshot(frame, detection.bbox, "zone-check", detection.track_id),
    )
    promoted = tracker.check_persistence(
        detection.track_id,
        f"zone_intrusion:{zone_id}",
        inside,
        frame_threshold=frame_threshold,
    )
    alert = None
    alert_args = None
    if promoted and entity_type == "person":
        matched = face_match_result
        if matched is None and face_matcher:
            matched = face_matcher(detection.track_id, frame, detection.bbox)
        authorization = authorization_checker(detection.track_id, zone_id, matched)
        event.metadata.update(
            {
                "authorization_outcome": authorization["outcome"],
                "person_id": authorization["person_id"],
            }
        )
        reason = authorization_reason(authorization["outcome"])
        if reason:
            event.event_description = reason
        if authorization["outcome"] != "authorized":
            alert_args = ("zone_intrusion", "high" if authorization["outcome"] == "unresolved" else "medium")
    elif promoted:
        alert_args = ("zone_intrusion", "medium")
    if event_store:
        event = event_store.save_event(event)
    if alert_args and alert_manager:
        alert = alert_manager.create_alert_from_event(event, *alert_args)
    return event, alert
