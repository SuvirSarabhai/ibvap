"""Serve saved evidence snapshots from the evidence/ directory."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

_EVIDENCE_DIR = Path(__file__).resolve().parents[2] / "evidence"


@router.get("/{filename}")
def get_evidence(filename: str):
    """Return a saved evidence snapshot image."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = _EVIDENCE_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found")

    suffix = path.suffix.lower()
    media_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}.get(suffix, "image/jpeg")
    return FileResponse(str(path), media_type=media_type)
