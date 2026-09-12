"""Serve saved evidence snapshots from the evidence/ directory."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import unquote

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

_EVIDENCE_DIR = Path(__file__).resolve().parents[2] / "evidence"


@router.get("/{filename}")
def get_evidence(filename: str):
    """Return a saved evidence snapshot image."""
    decoded_filename = unquote(filename)
    if "/" in decoded_filename or "\\" in decoded_filename or ".." in decoded_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    evidence_root = _EVIDENCE_DIR.resolve()
    path = (evidence_root / decoded_filename).resolve()
    try:
        path.relative_to(evidence_root)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Evidence file not found")

    suffix = path.suffix.lower()
    media_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}.get(suffix, "image/jpeg")
    return FileResponse(str(path), media_type=media_type)
