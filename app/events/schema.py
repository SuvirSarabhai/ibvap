"""Pydantic contracts shared by analytics, storage, and API layers."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class Event(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str = Field(default_factory=lambda: str(uuid4()))
    track_id: str
    camera_id: str
    event_type: str
    zone_id: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)
    evidence_path: str | None = None
    event_description: str | None = None
    event_type_label: str | None = None
    entity_type: str | None = None
    confidence: float | None = None
    threat_score: int = 0
    severity: Literal["low", "medium", "high", "normal"] = "normal"
    status: Literal["open", "reviewing", "closed", "escalated"] = "open"


class Alert(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    event_id: str
    alert_type: str
    severity: Literal["low", "medium", "high", "normal"]
    camera_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_path: str | None = None
    status: Literal["new", "acknowledged", "resolved", "false_positive", "escalated"] = "new"
    operator_id: str | None = None
    operator_note: str | None = None
    entity_id: str | None = None
    entity_type: str | None = None
    event_description: str | None = None
    event_type_label: str | None = None
    threat_score: int = 0
    zone_id: str | None = None
    assigned_to: str | None = None


class IncidentNote(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    operator: str
    text: str


class Incident(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    alert_id: str | None = None
    event_id: str | None = None
    incident_type: str
    entity_id: str | None = None
    entity_type: str | None = None
    severity: Literal["low", "medium", "high", "normal"] = "normal"
    camera_id: str
    zone_id: str | None = None
    opened_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_to: str | None = None
    status: Literal["open", "reviewing", "escalated", "closed"] = "open"
    evidence_count: int = 0
    notes: list[IncidentNote] = Field(default_factory=list)


class IncidentNoteCreate(BaseModel):
    operator: str
    text: str


class IncidentUpdate(BaseModel):
    status: Literal["open", "reviewing", "escalated", "closed"] | None = None
    assigned_to: str | None = None
    operator_note: str | None = None


class EventStatusUpdate(BaseModel):
    status: Literal["open", "reviewing", "closed", "escalated"]
