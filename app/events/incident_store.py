"""Persistence operations for confirmed incidents."""

from __future__ import annotations

from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import IncidentModel
from app.events.schema import Incident, IncidentNote
from app.utils.logger import get_logger

logger = get_logger(__name__)


class IncidentStore:
    def __init__(self, session_factory=SessionLocal):
        self.session_factory = session_factory

    @staticmethod
    def _to_schema(row: IncidentModel) -> Incident:
        notes = [IncidentNote.model_validate(note) for note in (row.notes or [])]
        return Incident(
            incident_id=row.incident_id,
            alert_id=row.alert_id,
            event_id=row.event_id,
            incident_type=row.incident_type,
            entity_id=row.entity_id,
            entity_type=row.entity_type,
            severity=row.severity,
            camera_id=row.camera_id,
            zone_id=row.zone_id,
            opened_at=row.opened_at,
            assigned_to=row.assigned_to,
            status=row.status,
            evidence_count=row.evidence_count or 0,
            notes=notes,
        )

    def create_incident(self, incident: Incident) -> Incident:
        session = self.session_factory()
        try:
            row = IncidentModel(
                incident_id=incident.incident_id,
                alert_id=incident.alert_id,
                event_id=incident.event_id,
                incident_type=incident.incident_type,
                entity_id=incident.entity_id,
                entity_type=incident.entity_type,
                severity=incident.severity,
                camera_id=incident.camera_id,
                zone_id=incident.zone_id,
                opened_at=incident.opened_at,
                assigned_to=incident.assigned_to,
                status=incident.status,
                evidence_count=incident.evidence_count,
                notes=[note.model_dump(mode="json") for note in incident.notes],
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return self._to_schema(row)
        except Exception:
            session.rollback()
            logger.exception("Could not create incident %s", incident.incident_id)
            raise
        finally:
            session.close()

    def get_incidents(self, status=None, severity=None, page=1, page_size=50, entity_type=None) -> list[Incident]:
        session = self.session_factory()
        try:
            query = select(IncidentModel).order_by(IncidentModel.opened_at.desc())
            if status:
                query = query.where(IncidentModel.status == status)
            if severity:
                query = query.where(IncidentModel.severity == severity)
            if entity_type:
                query = query.where(IncidentModel.entity_type == entity_type)
            size = min(max(1, page_size), 200)
            query = query.offset((max(1, page) - 1) * size).limit(size)
            return [self._to_schema(row) for row in session.scalars(query).all()]
        finally:
            session.close()

    def update_incident(self, incident_id, status=None, assigned_to=None, operator_note=None) -> Incident | None:
        session = self.session_factory()
        try:
            row = session.get(IncidentModel, incident_id)
            if row is None:
                return None
            if status is not None:
                if status not in {"open", "reviewing", "escalated", "closed"}:
                    raise ValueError(f"Unsupported incident status: {status}")
                row.status = status
            if assigned_to is not None:
                row.assigned_to = assigned_to
            if operator_note:
                notes = list(row.notes or [])
                notes.append(IncidentNote(operator="System", text=operator_note).model_dump(mode="json"))
                row.notes = notes
            session.commit()
            session.refresh(row)
            return self._to_schema(row)
        finally:
            session.close()

    def add_note(self, incident_id, operator, text) -> Incident | None:
        session = self.session_factory()
        try:
            row = session.get(IncidentModel, incident_id)
            if row is None:
                return None
            notes = list(row.notes or [])
            notes.append(IncidentNote(operator=operator, text=text).model_dump(mode="json"))
            row.notes = notes
            session.commit()
            session.refresh(row)
            return self._to_schema(row)
        finally:
            session.close()


def create_incident(incident: Incident) -> Incident:
    return IncidentStore().create_incident(incident)


def get_incidents(**filters) -> list[Incident]:
    return IncidentStore().get_incidents(**filters)
