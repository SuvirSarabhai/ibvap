"""Alert query and operator review routes."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.events.alert_manager import AlertManager
from app.events.schema import Alert

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertStatusUpdate(BaseModel):
    status: Literal["new", "acknowledged", "resolved", "false_positive"]
    operator_id: str | None = None
    operator_note: str | None = None


@router.get("", response_model=list[Alert])
def list_alerts(
    status: str | None = None,
    severity: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    return AlertManager().get_alerts(status, severity, page, page_size)


@router.patch("/{alert_id}", response_model=Alert)
def update_alert(alert_id: str, update: AlertStatusUpdate):
    try:
        alert = AlertManager().update_alert_status(
            alert_id,
            update.status,
            update.operator_id,
            update.operator_note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
