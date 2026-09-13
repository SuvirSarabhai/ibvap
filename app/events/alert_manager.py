"""Alert promotion and operator status updates."""

from __future__ import annotations

from datetime import timedelta

import yaml
from sqlalchemy import select

from app.utils.paths import CONFIG_DIR

from app.db.database import SessionLocal
from app.db.models import AlertModel, EventModel, WatchlistModel
from app.events.schema import Alert, Event
from app.utils.logger import get_logger
from app.utils.threat_score import compute_threat_score

logger = get_logger(__name__)
VALID_STATUSES = {"new", "acknowledged", "resolved", "false_positive", "escalated"}
ALERT_FIELDS = (
    "alert_id", "event_id", "alert_type", "severity", "camera_id", "timestamp",
    "evidence_path", "status", "operator_id", "operator_note", "entity_id",
    "entity_type", "event_description", "event_type_label", "threat_score",
    "zone_id", "assigned_to",
)


def _alert_from_row(row: AlertModel) -> Alert:
    return Alert(**{field: getattr(row, field) for field in ALERT_FIELDS})


def _entity_id(event: Event) -> str | None:
    return str(event.metadata.get("entity_id") or event.metadata.get("plate") or event.track_id or "") or None


class AlertManager:
    def __init__(self, session_factory=SessionLocal, broadcaster=None, cooldown_seconds: float | None = None):
        self.session_factory = session_factory
        self.cooldown_seconds = self._load_cooldown() if cooldown_seconds is None else max(0.0, float(cooldown_seconds))
        if broadcaster is None:
            try:
                from app.api.websocket import publish

                broadcaster = publish
            except ImportError:
                broadcaster = None
        self.broadcaster = broadcaster

    @staticmethod
    def _load_cooldown() -> float:
        try:
            with (CONFIG_DIR / "thresholds.yaml").open(encoding="utf-8") as config_file:
                values = yaml.safe_load(config_file) or {}
            return max(0.0, float(values.get("alert_cooldown_seconds", 60)))
        except (OSError, TypeError, ValueError, yaml.YAMLError):
            return 60.0

    def create_alert_from_event(self, event: Event, alert_type: str, severity: str = "medium") -> Alert | None:
        event.severity = severity
        session = self.session_factory()
        try:
            cutoff = event.timestamp - timedelta(seconds=self.cooldown_seconds)
            zone_filter = AlertModel.zone_id.is_(None) if event.zone_id is None else AlertModel.zone_id == event.zone_id
            duplicate = session.scalar(
                select(AlertModel)
                .where(
                    AlertModel.alert_type == alert_type,
                    AlertModel.camera_id == event.camera_id,
                    zone_filter,
                    AlertModel.timestamp >= cutoff,
                    AlertModel.timestamp <= event.timestamp,
                )
                .order_by(AlertModel.timestamp.desc())
                .limit(1)
            )
            if duplicate is not None:
                logger.info(
                    "Suppressing alert %s for camera=%s zone=%s within %.1fs cooldown",
                    alert_type,
                    event.camera_id,
                    event.zone_id,
                    self.cooldown_seconds,
                )
                return None

            recent = session.scalars(
                select(EventModel).where(
                    EventModel.track_id == event.track_id,
                    EventModel.timestamp >= event.timestamp - timedelta(minutes=10),
                    EventModel.timestamp <= event.timestamp,
                    EventModel.zone_id.is_not(None),
                )
            ).all()
            zones = {row.zone_id for row in recent if row.zone_id and row.zone_id != event.zone_id}
            threat_score = compute_threat_score(
                event,
                is_restricted=self.is_restricted,
                recent_zone_count=len(zones),
            )
            alert = Alert(
                event_id=event.event_id,
                alert_type=alert_type,
                severity=severity,
                camera_id=event.camera_id,
                timestamp=event.timestamp,
                evidence_path=event.evidence_path,
                entity_id=_entity_id(event),
                entity_type=event.entity_type,
                event_description=event.event_description,
                event_type_label=event.event_type_label,
                threat_score=threat_score,
                zone_id=event.zone_id,
            )
            row = AlertModel(**alert.model_dump())
            session.add(row)
            session.commit()
            session.refresh(row)
            alert = _alert_from_row(row)
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
        assigned_to: str | None = None,
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
            if assigned_to is not None:
                row.assigned_to = assigned_to
            session.commit()
            session.refresh(row)
            return _alert_from_row(row)
        finally:
            session.close()

    def get_alerts(self, status=None, severity=None, entity_type=None, threat_score_min=None, page=1, page_size=50) -> list[Alert]:
        session = self.session_factory()
        try:
            query = select(AlertModel).order_by(AlertModel.timestamp.desc())
            if status:
                query = query.where(AlertModel.status == status)
            if severity:
                query = query.where(AlertModel.severity == severity)
            if entity_type:
                query = query.where(AlertModel.entity_type == entity_type)
            if threat_score_min is not None:
                query = query.where(AlertModel.threat_score >= threat_score_min)
            size = min(max(1, page_size), 200)
            query = query.offset((max(1, page) - 1) * size).limit(size)
            return [_alert_from_row(row) for row in session.scalars(query).all()]
        finally:
            session.close()

    def update_alert(self, alert_id: str, assigned_to: str | None = None) -> Alert | None:
        session = self.session_factory()
        try:
            row = session.get(AlertModel, alert_id)
            if row is None:
                return None
            row.assigned_to = assigned_to
            session.commit()
            session.refresh(row)
            return _alert_from_row(row)
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
