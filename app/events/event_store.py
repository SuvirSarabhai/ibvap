"""Persistence operations for analytics events."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import EventModel
from app.events.schema import Event
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EventStore:
    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory

    @staticmethod
    def _to_schema(row: EventModel) -> Event:
        return Event(
            event_id=row.event_id,
            track_id=row.track_id,
            camera_id=row.camera_id,
            event_type=row.event_type,
            zone_id=row.zone_id,
            timestamp=row.timestamp,
            metadata=dict(row.event_metadata or {}),
            evidence_path=row.evidence_path,
            event_description=row.event_description,
            event_type_label=row.event_type_label,
            entity_type=row.entity_type,
            confidence=row.confidence,
            threat_score=row.threat_score or 0,
            severity=row.severity or "normal",
            status=row.status or "open",
        )

    def save_event(self, event: Event) -> Event:
        session = self.session_factory()
        try:
            row = EventModel(
                event_id=event.event_id,
                track_id=event.track_id,
                camera_id=event.camera_id,
                event_type=event.event_type,
                zone_id=event.zone_id,
                timestamp=event.timestamp,
                event_metadata=event.metadata,
                evidence_path=event.evidence_path,
                event_description=event.event_description,
                event_type_label=event.event_type_label,
                entity_type=event.entity_type,
                confidence=event.confidence,
                threat_score=event.threat_score,
                severity=event.severity,
                status=event.status,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return self._to_schema(row)
        except Exception:
            session.rollback()
            logger.exception("Could not save event %s", event.event_id)
            raise
        finally:
            session.close()

    def get_events(
        self,
        camera_id: str | None = None,
        event_type: str | None = None,
        from_time: datetime | None = None,
        to_time: datetime | None = None,
        page: int = 1,
        page_size: int = 50,
        severity: str | None = None,
        status: str | None = None,
    ) -> list[Event]:
        session = self.session_factory()
        try:
            query = select(EventModel).order_by(EventModel.timestamp.desc())
            if camera_id:
                query = query.where(EventModel.camera_id == camera_id)
            if event_type:
                query = query.where(EventModel.event_type == event_type)
            if from_time:
                query = query.where(EventModel.timestamp >= from_time)
            if to_time:
                query = query.where(EventModel.timestamp <= to_time)
            if severity:
                query = query.where(EventModel.severity == severity)
            if status:
                query = query.where(EventModel.status == status)
            size = min(max(1, page_size), 200)
            query = query.offset((max(1, page) - 1) * size).limit(size)
            return [self._to_schema(row) for row in session.scalars(query).all()]
        finally:
            session.close()

    def update_status(self, event_id: str, status: str) -> Event | None:
        if status not in {"open", "reviewing", "closed", "escalated"}:
            raise ValueError(f"Unsupported event status: {status}")
        session = self.session_factory()
        try:
            row = session.get(EventModel, event_id)
            if row is None:
                return None
            row.status = status
            session.commit()
            session.refresh(row)
            return self._to_schema(row)
        finally:
            session.close()


def save_event(event: Event) -> Event:
    return EventStore().save_event(event)


def get_events(**filters) -> list[Event]:
    return EventStore().get_events(**filters)
