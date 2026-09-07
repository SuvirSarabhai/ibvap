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


class Alert(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str = Field(default_factory=lambda: str(uuid4()))
    event_id: str
    alert_type: str
    severity: Literal["low", "medium", "high"]
    camera_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    evidence_path: str | None = None
    status: Literal["new", "acknowledged", "resolved", "false_positive"] = "new"
    operator_id: str | None = None
    operator_note: str | None = None
