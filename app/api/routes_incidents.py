"""Incident case-management routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.events.incident_store import IncidentStore
from app.events.schema import Incident, IncidentNoteCreate, IncidentUpdate

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("", response_model=Incident)
def create_incident(incident: Incident):
    return IncidentStore().create_incident(incident)


@router.get("", response_model=list[Incident])
def list_incidents(
    status: str | None = None,
    severity: str | None = None,
    entity_type: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    return IncidentStore().get_incidents(status, severity, page, page_size, entity_type)


@router.patch("/{incident_id}", response_model=Incident)
def update_incident(incident_id: str, update: IncidentUpdate):
    try:
        incident = IncidentStore().update_incident(
            incident_id,
            update.status,
            update.assigned_to,
            update.operator_note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/{incident_id}/notes", response_model=Incident)
def add_incident_note(incident_id: str, note: IncidentNoteCreate):
    incident = IncidentStore().add_note(incident_id, note.operator, note.text)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
