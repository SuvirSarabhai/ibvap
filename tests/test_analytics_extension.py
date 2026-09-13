from datetime import datetime, timezone

import numpy as np

from app.core.detector import Detection
from app.core.incident_tracker import IncidentTracker
from app.core.track_history import TrackHistory
from app.events.schema import Event
from app.modules.loitering import process_loitering
from app.modules.vehicle_behavior import VehicleBehaviorState, process_vehicle_behavior
from app.utils.threat_score import compute_threat_score


class Store:
    def __init__(self):
        self.events = []

    def save_event(self, event):
        self.events.append(event)
        return event


class Alerts:
    def __init__(self):
        self.calls = []

    def create_alert_from_event(self, *args):
        self.calls.append(args)
        return args

    def is_restricted(self, plate):
        return plate == "RESTRICTED"


def test_track_history_speed_and_reset():
    now = [10.0]
    history = TrackHistory(clock=lambda: now[0])
    assert history.update("t", 0, 0) == 0
    now[0] = 11.0
    assert history.update("t", 3, 4) == 5
    history.clear("t")
    assert history.speed("t") == 0


def test_loitering_authorized_has_no_alert():
    tracker = IncidentTracker()
    store = Store()
    alerts = Alerts()
    detection = Detection("p", "person", (2, 2, 4, 4), 0.9)
    for _ in range(2):
        process_loitering(
            detection, "cam", "zone", [[0, 0], [10, 0], [10, 10], [0, 10]],
            tracker, 0, store, alerts, np.zeros((20, 20, 3), dtype=np.uint8),
            face_match_result={"person_id": "p1"},
            authorization_checker=lambda *_: {"outcome": "authorized", "person_id": "p1"},
        )
    assert len(store.events) == 1
    assert store.events[0].event_description == "Loitering threshold exceeded"
    assert store.events[0].metadata["authorization_outcome"] == "authorized"
    assert store.events[0].metadata["person_id"] == "p1"
    assert alerts.calls == []


def test_loitering_unauthorized_preserves_outcome_and_alert_reason():
    tracker = IncidentTracker()
    store = Store()
    alerts = Alerts()
    detection = Detection("p", "person", (2, 2, 4, 4), 0.9)
    for _ in range(2):
        process_loitering(
            detection, "cam", "zone", [[0, 0], [10, 0], [10, 10], [0, 10]],
            tracker, 0, store, alerts, np.zeros((20, 20, 3), dtype=np.uint8),
            authorization_checker=lambda *_: {"outcome": "unauthorized", "person_id": None},
        )
    assert len(store.events) == 1
    assert store.events[0].event_description == "Loitering threshold exceeded"
    assert store.events[0].metadata["authorization_outcome"] == "unauthorized"
    assert store.events[0].metadata["person_id"] is None
    assert len(alerts.calls) == 1
    assert alerts.calls[0][0].event_description == "Loitering threshold exceeded"


def test_loitering_unresolved_preserves_outcome_and_alert_reason():
    tracker = IncidentTracker()
    store = Store()
    alerts = Alerts()
    detection = Detection("p", "person", (2, 2, 4, 4), 0.9)
    for _ in range(2):
        process_loitering(
            detection, "cam", "zone", [[0, 0], [10, 0], [10, 10], [0, 10]],
            tracker, 0, store, alerts, np.zeros((20, 20, 3), dtype=np.uint8),
            authorization_checker=lambda *_: {"outcome": "unresolved", "person_id": None},
        )
    assert len(store.events) == 1
    assert store.events[0].event_description == "Loitering threshold exceeded"
    assert store.events[0].metadata["authorization_outcome"] == "unresolved"
    assert store.events[0].metadata["person_id"] is None
    assert len(alerts.calls) == 1
    assert alerts.calls[0][0].event_description == "Loitering threshold exceeded"


def test_vehicle_dwell_does_not_require_plate():
    tracker = IncidentTracker()
    history = TrackHistory(clock=iter([0.0, 1.0, 2.0, 20.0, 21.0]).__next__)
    state = VehicleBehaviorState()
    store = Store()
    alerts = Alerts()
    zone = {"zone_id": "sensitive", "polygon": [[0, 0], [20, 0], [20, 20], [0, 20]], "sensitive": True, "dwell_threshold_seconds": 0, "moving_speed_threshold": 1}
    frame = np.zeros((30, 30, 3), dtype=np.uint8)
    boxes = [(2, 2, 4, 4), (2, 2, 4, 4), (2, 2, 4, 4), (10, 2, 12, 4), (18, 2, 20, 4)]
    for bbox in boxes:
        result = process_vehicle_behavior(Detection("v", "car", bbox, 0.9), "cam", zone, history, tracker, state, store, alerts, frame)
    assert result[0] is not None
    assert result[0].evidence_path
    assert result[0].metadata["plate"] is None


def test_new_threat_score_signals():
    unauthorized_loiter = Event(track_id="p", camera_id="c", event_type="loitering", metadata={"authorization_outcome": "unauthorized"})
    unresolved = Event(track_id="p", camera_id="c", event_type="zone_check", metadata={"authorization_outcome": "unresolved"})
    dwell = Event(track_id="v", camera_id="c", event_type="vehicle_dwell_sensitive_zone", entity_type="vehicle")
    assert compute_threat_score(unauthorized_loiter) == 15
    assert compute_threat_score(unresolved) == 10
    assert compute_threat_score(dwell) == 30


def test_event_timestamp_is_timezone_aware():
    event = Event(track_id="x", camera_id="c", event_type="test")
    assert event.timestamp.tzinfo is not None
    assert datetime.now(timezone.utc).utcoffset() is not None
