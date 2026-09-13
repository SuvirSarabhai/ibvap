from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import AlertModel, EventModel
from app.events.alert_manager import AlertManager
from app.events.event_store import EventStore
from app.events.schema import Event


def test_alert_cooldown_is_scoped_and_expires(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'cooldown.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    store = EventStore(sessions)
    manager = AlertManager(sessions, broadcaster=None, cooldown_seconds=60)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    first = store.save_event(Event(track_id="1", camera_id="cam", event_type="zone_check", zone_id="alpha", timestamp=start))
    assert manager.create_alert_from_event(first, "zone_intrusion") is not None
    repeated = store.save_event(Event(track_id="2", camera_id="cam", event_type="zone_check", zone_id="alpha", timestamp=start + timedelta(seconds=30)))
    assert manager.create_alert_from_event(repeated, "zone_intrusion") is None
    other_zone = store.save_event(Event(track_id="3", camera_id="cam", event_type="zone_check", zone_id="beta", timestamp=start + timedelta(seconds=30)))
    assert manager.create_alert_from_event(other_zone, "zone_intrusion") is not None
    after_window = store.save_event(Event(track_id="4", camera_id="cam", event_type="zone_check", zone_id="alpha", timestamp=start + timedelta(seconds=61)))
    assert manager.create_alert_from_event(after_window, "zone_intrusion") is not None


def test_event_and_alert_storage(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    store = EventStore(sessions)
    manager = AlertManager(sessions)
    event = store.save_event(Event(track_id="1", camera_id="cam", event_type="zone_check", timestamp=datetime.now(timezone.utc)))
    manager.create_alert_from_event(event, "zone_intrusion", "medium")
    with sessions() as session:
        assert session.scalar(select(func.count()).select_from(EventModel)) == 1
        assert session.scalar(select(func.count()).select_from(AlertModel)) == 1
    alert = manager.get_alerts()[0]
    updated = manager.update_alert_status(alert.alert_id, "acknowledged", "operator-1", "reviewed")
    assert updated.status == "acknowledged"
    assert updated.operator_note == "reviewed"
