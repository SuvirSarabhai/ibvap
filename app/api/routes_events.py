"""Event query routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query

from app.events.event_store import EventStore
from app.events.schema import Event

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[Event])
def list_events(
    camera_id: str | None = None,
    event_type: str | None = None,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    return EventStore().get_events(camera_id, event_type, from_, to, page, page_size)
