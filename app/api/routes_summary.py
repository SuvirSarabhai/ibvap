"""Dashboard summary route."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import func, select

from app.db.database import SessionLocal
from app.db.models import AlertModel, CameraModel, IncidentModel

router = APIRouter(prefix="/api", tags=["summary"])


@router.get("/summary")
def get_summary():
    session = SessionLocal()
    try:
        cameras_total = session.scalar(select(func.count()).select_from(CameraModel)) or 0
        cameras_online = session.scalar(select(func.count()).select_from(CameraModel).where(CameraModel.status == "online")) or 0
        active_subquery = select(AlertModel).where(AlertModel.status.in_(["new", "acknowledged"])).subquery()
        high = session.scalar(select(func.count()).select_from(active_subquery).where(active_subquery.c.severity == "high")) or 0
        medium = session.scalar(select(func.count()).select_from(active_subquery).where(active_subquery.c.severity == "medium")) or 0
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        incidents_today = session.scalar(select(func.count()).select_from(IncidentModel).where(IncidentModel.opened_at >= today)) or 0
        confirmed = session.scalar(select(func.count()).select_from(IncidentModel).where(IncidentModel.opened_at >= today, IncidentModel.status.in_(["closed", "reviewing"]))) or 0
        pending = session.scalar(select(func.count()).select_from(IncidentModel).where(IncidentModel.opened_at >= today, IncidentModel.status.in_(["open", "escalated"]))) or 0
        return {
            "cameras_total": cameras_total,
            "cameras_online": cameras_online,
            "cameras_offline": max(0, cameras_total - cameras_online),
            "active_threats_high": high,
            "active_threats_medium": medium,
            "incidents_today": incidents_today,
            "incidents_confirmed": confirmed,
            "incidents_pending": pending,
            "system_health_pct": 98,
        }
    finally:
        session.close()
