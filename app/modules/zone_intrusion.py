"""Zone intrusion geometry and event-promotion helpers."""

from __future__ import annotations

from typing import Iterable

import cv2
import numpy as np

from datetime import datetime, timezone

from app.events.schema import Event


from app.core.detector import Detection
from app.core.incident_tracker import IncidentTracker


def check_zone(track_id: str, bbox: Iterable[float], zone_polygon: list[list[float]]) -> bool:
    """Check the center of a tracked bbox against a configured polygon."""
    del track_id  # Track identity is used by the caller's persistence state.
    x1, y1, x2, y2 = bbox
    center = ((float(x1) + float(x2)) / 2, (float(y1) + float(y2)) / 2)
    polygon = np.asarray(zone_polygon, dtype=np.float32).reshape((-1, 1, 2))
    return cv2.pointPolygonTest(polygon, center, False) >= 0


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
    )
    if event_store:
        event = event_store.save_event(event)
    promoted = tracker.check_persistence(
        detection.track_id,
        f"zone_intrusion:{zone_id}",
        inside,
        frame_threshold=frame_threshold,
    )
    alert = None
    if promoted and alert_manager:
        alert = alert_manager.create_alert_from_event(event, "zone_intrusion", "medium")
    return event, alert
