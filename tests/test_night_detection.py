from datetime import datetime, timezone

import numpy as np

from app.core.incident_tracker import IncidentTracker
from app.modules.night_detection import process_night_check


class Store:
    def __init__(self):
        self.events = []

    def save_event(self, event):
        self.events.append(event)
        return event


def test_night_event_with_frame_but_without_bbox_keeps_evidence(monkeypatch):
    monkeypatch.setattr(
        "app.modules.night_detection.save_evidence_snapshot",
        lambda frame, bbox, prefix, track_id: "evidence/night-full-frame.jpg",
    )
    store = Store()
    event, _ = process_night_check(
        "track",
        "camera",
        "zone",
        True,
        IncidentTracker(),
        duration_seconds=0,
        event_store=store,
        current_time=datetime(2026, 1, 1, 22, tzinfo=timezone.utc),
        frame=np.zeros((12, 16, 3), dtype=np.uint8),
        bbox=None,
    )
    assert event.evidence_path == "evidence/night-full-frame.jpg"
