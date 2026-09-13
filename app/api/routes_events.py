"""Event query routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.events.event_store import EventStore
from app.events.schema import Event, EventStatusUpdate

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[Event])
def list_events(
    camera_id: str | None = None,
    event_type: str | None = None,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    # Activity Log is a unified stream; include the full API page by default so
    # ad-hoc/demo camera events are not hidden behind the recent-event cutoff.
    page_size: int = Query(default=200, ge=1, le=200),
    severity: str | None = None,
    status: str | None = None,
):
    return EventStore().get_events(camera_id, event_type, from_, to, page, page_size, severity, status)


@router.get("/{event_id}", response_model=Event)
def get_event(event_id: str):
    from app.db.database import SessionLocal
    from app.db.models import EventModel
    session = SessionLocal()
    try:
        row = session.get(EventModel, event_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Event not found")
        return EventStore()._to_schema(row)
    finally:
        session.close()


@router.patch("/{event_id}", response_model=Event)
def update_event(event_id: str, update: EventStatusUpdate):
    try:
        event = EventStore().update_status(event_id, update.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
