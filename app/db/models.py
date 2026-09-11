"""SQLAlchemy table mappings for the prototype."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EventModel(Base):
    __tablename__ = "events"
    __table_args__ = (Index("ix_events_camera_timestamp", "camera_id", "timestamp"),)

    event_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    track_id: Mapped[str] = mapped_column(String(100), index=True)
    camera_id: Mapped[str] = mapped_column(String(100), index=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    zone_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    event_metadata: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    evidence_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    confidence: Mapped[float | None] = mapped_column(nullable=True)
    threat_score: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[str] = mapped_column(String(20), default="normal", index=True)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    alerts: Mapped[list["AlertModel"]] = relationship(back_populates="event")


class AlertModel(Base):
    __tablename__ = "alerts"
    __table_args__ = (Index("ix_alerts_status_severity", "status", "severity"),)

    alert_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.event_id"), index=True)
    alert_type: Mapped[str] = mapped_column(String(100), index=True)
    severity: Mapped[str] = mapped_column(String(20), index=True)
    camera_id: Mapped[str] = mapped_column(String(100), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    evidence_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="new", index=True)
    operator_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    operator_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    event_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_type_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    threat_score: Mapped[int] = mapped_column(Integer, default=0)
    zone_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event: Mapped[EventModel] = relationship(back_populates="alerts")


class IncidentModel(Base):
    __tablename__ = "incidents"
    __table_args__ = (Index("ix_incidents_status_severity", "status", "severity"),)

    incident_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    alert_id: Mapped[str | None] = mapped_column(ForeignKey("alerts.alert_id"), nullable=True, index=True)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.event_id"), nullable=True, index=True)
    incident_type: Mapped[str] = mapped_column(String(100))
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    entity_type: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    severity: Mapped[str] = mapped_column(String(20), default="normal", index=True)
    camera_id: Mapped[str] = mapped_column(String(100), index=True)
    zone_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    assigned_to: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    evidence_count: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[list] = mapped_column(JSON, default=list)


class CameraModel(Base):
    __tablename__ = "cameras"

    camera_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    source: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="offline")


class ZoneModel(Base):
    __tablename__ = "zones"

    zone_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    camera_id: Mapped[str] = mapped_column(String(100), index=True)
    polygon: Mapped[list] = mapped_column(JSON)
    sensitivity: Mapped[str] = mapped_column(String(20), default="medium")


class VehicleModel(Base):
    __tablename__ = "vehicles"

    vehicle_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    track_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    camera_id: Mapped[str | None] = mapped_column(String(100), nullable=True)


class WatchlistModel(Base):
    __tablename__ = "watchlist"

    plate: Mapped[str] = mapped_column(String(20), primary_key=True)
    status: Mapped[str] = mapped_column(String(30), default="restricted", index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
