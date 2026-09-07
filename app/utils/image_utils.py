"""Evidence snapshot helper."""

from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import cv2

from app.utils.logger import get_logger
from app.utils.paths import EVIDENCE_DIR, REPOSITORY_ROOT

logger = get_logger(__name__)


def save_evidence_snapshot(frame, bbox) -> str | None:
    if frame is None:
        return None
    try:
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = (int(value) for value in bbox)
        x1, x2 = max(0, min(x1, width)), max(0, min(x2, width))
        y1, y2 = max(0, min(y1, height)), max(0, min(y2, height))
        if x2 <= x1 or y2 <= y1:
            return None
        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        path = EVIDENCE_DIR / f"snapshot-{uuid4().hex}.jpg"
        if not cv2.imwrite(str(path), frame[y1:y2, x1:x2]):
            return None
        return str(path.relative_to(REPOSITORY_ROOT)).replace("\\", "/")
    except Exception:
        logger.exception("Could not save evidence snapshot")
        return None
