from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.db.models import EventModel
from app.events.event_store import EventStore
from app.events.schema import Event
from app.api import routes_events


def test_list_events_includes_face_match_from_nonstandard_camera(monkeypatch, tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'events.db'}")
    Base.metadata.create_all(engine)
    sessions = sessionmaker(bind=engine, expire_on_commit=False)
    event = Event(
        track_id="face-match-reference",
        camera_id="face-match-demo",
        event_type="face_match",
        timestamp=datetime.now(timezone.utc),
        metadata={"reference_identity": "reference-1"},
        evidence_path="evidence/face-match.jpg",
        event_description="Known face matched — Reference face",
        event_type_label="Face Match",
        entity_type="person",
        confidence=0.91,
    )
    EventStore(sessions).save_event(event)

    monkeypatch.setattr(routes_events, "EventStore", lambda: EventStore(sessions))
    app = FastAPI()
    app.include_router(routes_events.router)
    response = TestClient(app).get("/api/events")

    assert response.status_code == 200
    payload = response.json()
    assert any(
        row["event_id"] == event.event_id
        and row["camera_id"] == "face-match-demo"
        and row["event_type"] == "face_match"
        for row in payload
    )
