from pathlib import Path

import numpy as np

from app.api.routes_evidence import get_evidence
from app.db.database import Base, SessionLocal, engine, init_db
from app.db.models import WatchlistModel
from app.events.alert_manager import AlertManager
from app.events.event_store import EventStore
from app.events.schema import Event
from app.modules.vehicle_behavior import VehicleBehaviorState, process_vehicle_behavior
from app.core.detector import Detection
from app.core.incident_tracker import IncidentTracker
from app.core.track_history import TrackHistory
from app.utils.demo_profiles import PROFILE_NAMES, apply_demo_profile, load_demo_profiles
from fastapi import HTTPException


def test_demo_profiles_are_named_and_dwell_is_shorter():
    profiles = load_demo_profiles()
    assert set(PROFILE_NAMES) <= set(profiles)
    assert apply_demo_profile({"dwell_threshold_seconds": 15}, "vehicle_dwell")["dwell_threshold_seconds"] == 9


def test_evidence_rejects_resolved_path_escape():
    try:
        get_evidence("%2e%2e%2foutside.jpg")
    except HTTPException as exc:
        assert exc.status_code == 400
    else:
        raise AssertionError("path escape should be rejected")


def test_event_and_alert_keep_anpr_evidence(tmp_path, monkeypatch):
    monkeypatch.setattr("app.utils.image_utils.EVIDENCE_DIR", tmp_path)
    event_store = EventStore()
    alert_manager = AlertManager(broadcaster=None)
    init_db()
    event = event_store.save_event(Event(
        track_id="v1", camera_id="camera-car", event_type="vehicle_plate",
        metadata={"plate": "AB12C3456"}, evidence_path="evidence/anpr_v1.jpg",
        event_description="Restricted plate match", event_type_label="Restricted Plate",
        entity_type="vehicle", severity="high",
    ))
    alert = alert_manager.create_alert_from_event(event, "restricted_vehicle", "high")
    assert alert.evidence_path == event.evidence_path


def test_vehicle_dwell_promotes_once_after_resume():
    tracker = IncidentTracker(clock=iter([0.0, 1.0, 2.0, 20.0, 21.0, 22.0]).__next__)
    history = TrackHistory(clock=iter([0.0, 1.0, 2.0, 20.0, 21.0, 22.0]).__next__)
    state = VehicleBehaviorState()
    zone = {"zone_id": "sensitive", "polygon": [[0, 0], [20, 0], [20, 20], [0, 20]], "sensitive": True, "dwell_threshold_seconds": 0, "moving_speed_threshold": 1}
    events = []
    class Store:
        def save_event(self, event):
            events.append(event)
            return event
    class Alerts:
        def create_alert_from_event(self, event, *args):
            return event
    frame = np.zeros((30, 30, 3), dtype=np.uint8)
    boxes = [(2, 2, 4, 4), (2, 2, 4, 4), (2, 2, 4, 4), (10, 2, 12, 4), (18, 2, 20, 4), (18, 2, 20, 4)]
    results = [process_vehicle_behavior(Detection("v", "car", bbox, 0.9), "cam", zone, history, tracker, state, Store(), Alerts(), frame) for bbox in boxes]
    assert sum(result[0] is not None for result in results) == 1
    assert len(events) == 1


def test_sqlite_event_persistence():
    init_db()
    store = EventStore()
    saved = store.save_event(Event(track_id="persist", camera_id="camera-1", event_type="test"))
    assert any(event.event_id == saved.event_id for event in store.get_events(camera_id="camera-1"))
