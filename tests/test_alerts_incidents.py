from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import AlertModel, IncidentModel
from app.events.alert_manager import AlertManager
from app.events.event_store import EventStore
from app.events.incident_store import IncidentStore
from app.events.schema import Event


def test_default_alert_page_includes_more_than_fifty_rows(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'alerts.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    events = EventStore(sessions)
    alerts = AlertManager(sessions, broadcaster=None, cooldown_seconds=0)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)

    for index in range(60):
        event = events.save_event(
            Event(
                track_id=f"track-{index}",
                camera_id="camera-1",
                event_type="night_check",
                timestamp=start + timedelta(seconds=index),
                severity="medium",
            )
        )
        assert alerts.create_alert_from_event(event, "night_movement", "medium") is not None

    assert len(alerts.get_alerts()) == 60


def test_escalating_alert_creates_linked_incident_once(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'incidents.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    events = EventStore(sessions)
    alerts = AlertManager(sessions, broadcaster=None, cooldown_seconds=0)
    incidents = IncidentStore(sessions)
    event = events.save_event(
        Event(
            track_id="person-1",
            camera_id="camera-1",
            event_type="zone_check",
            zone_id="restricted",
            metadata={"person_id": "person-1"},
            evidence_path="evidence/zone-check.jpg",
            event_description="Unauthorized person in restricted zone",
            event_type_label="Zone Entry",
            entity_type="person",
            severity="high",
        )
    )
    alert = alerts.create_alert_from_event(event, "zone_intrusion", "high")

    incident = incidents.create_from_alert(alert.alert_id)
    repeated = incidents.create_from_alert(alert.alert_id)

    assert incident is not None
    assert repeated.incident_id == incident.incident_id
    assert incident.alert_id == alert.alert_id
    assert incident.event_id == event.event_id
    assert incident.camera_id == event.camera_id
    assert incident.zone_id == event.zone_id
    assert incident.entity_id == "person-1"
    assert incident.severity == "high"
    assert incident.evidence_count == 1
    with sessions() as session:
        stored_alert = session.get(AlertModel, alert.alert_id)
        assert stored_alert.status == "escalated"
        assert session.scalar(select(func.count()).select_from(IncidentModel)) == 1
