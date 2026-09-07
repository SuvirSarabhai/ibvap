"""Alert promotion and operator status updates."""

from __future__ import annotations

from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import AlertModel, WatchlistModel
from app.events.schema import Alert, Event
from app.utils.logger import get_logger

logger = get_logger(__name__)
VALID_STATUSES = {"new", "acknowledged", "resolved", "false_positive"}


class AlertManager:
    def __init__(self, session_factory=SessionLocal, broadcaster=None):
        self.session_factory = session_factory
        if broadcaster is None:
            try:
                from app.api.websocket import publish

                broadcaster = publish
            except ImportError:
                broadcaster = None
        self.broadcaster = broadcaster

    def create_alert_from_event(self, event: Event, alert_type: str, severity: str = "medium") -> Alert:
        alert = Alert(
            event_id=event.event_id,
            alert_type=alert_type,
            severity=severity,
            camera_id=event.camera_id,
            timestamp=event.timestamp,
            evidence_path=event.evidence_path,
        )
        session = self.session_factory()
        try:
            row = AlertModel(**alert.model_dump())
            session.add(row)
            session.commit()
            session.refresh(row)
            alert = Alert.model_validate(row)
        except Exception:
            session.rollback()
            logger.exception("Could not create alert for event %s", event.event_id)
            raise
        finally:
            session.close()
        if self.broadcaster:
            self.broadcaster(alert)
        return alert

    def update_alert_status(
        self,
        alert_id: str,
        new_status: str,
        operator_id: str | None = None,
        operator_note: str | None = None,
    ) -> Alert | None:
        if new_status not in VALID_STATUSES:
            raise ValueError(f"Unsupported alert status: {new_status}")
        session = self.session_factory()
        try:
            row = session.get(AlertModel, alert_id)
            if row is None:
                return None
            row.status = new_status
            row.operator_id = operator_id
            row.operator_note = operator_note
            session.commit()
            session.refresh(row)
            return Alert(
                alert_id=row.alert_id,
                event_id=row.event_id,
                alert_type=row.alert_type,
                severity=row.severity,
                camera_id=row.camera_id,
                timestamp=row.timestamp,
                evidence_path=row.evidence_path,
                status=row.status,
                operator_id=row.operator_id,
                operator_note=row.operator_note,
            )
        finally:
            session.close()

    def get_alerts(self, status=None, severity=None, page=1, page_size=50) -> list[Alert]:
        session = self.session_factory()
        try:
            query = select(AlertModel).order_by(AlertModel.timestamp.desc())
            if status:
                query = query.where(AlertModel.status == status)
            if severity:
                query = query.where(AlertModel.severity == severity)
            size = min(max(1, page_size), 200)
            query = query.offset((max(1, page) - 1) * size).limit(size)
            return [Alert.model_validate(row) for row in session.scalars(query).all()]
        finally:
            session.close()

    def is_restricted(self, plate: str) -> bool:
        session = self.session_factory()
        try:
            row = session.get(WatchlistModel, plate)
            return bool(row and row.status == "restricted")
        finally:
            session.close()


def create_alert_from_event(event: Event, alert_type: str, severity: str = "medium") -> Alert:
    return AlertManager().create_alert_from_event(event, alert_type, severity)


def update_alert_status(alert_id: str, new_status: str, operator_id=None, operator_note=None):
    return AlertManager().update_alert_status(alert_id, new_status, operator_id, operator_note)
