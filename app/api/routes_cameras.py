"""Configured camera status route."""

from __future__ import annotations

from fastapi import APIRouter

from app.pipeline.orchestrator import get_camera_status

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


@router.get("")
def list_cameras():
    return get_camera_status()
