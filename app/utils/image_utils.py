"""Evidence snapshot helper."""

from __future__ import annotations

from uuid import uuid4

import cv2

from app.utils.logger import get_logger
from app.utils.paths import EVIDENCE_DIR, REPOSITORY_ROOT

logger = get_logger(__name__)


def save_evidence_snapshot(
    frame,
    bbox,
    prefix: str = "snapshot",
    track_id: str | None = None,
) -> str | None:
    """Save a padded JPEG crop and return its repository-relative path."""
    if frame is None:
        return None
    try:
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = (int(value) for value in bbox)
        box_width = max(1, x2 - x1)
        box_height = max(1, y2 - y1)
        pad_x = int(round(box_width * 0.12))
        pad_y = int(round(box_height * 0.12))
        x1, x2 = max(0, min(x1 - pad_x, width)), max(0, min(x2 + pad_x, width))
        y1, y2 = max(0, min(y1 - pad_y, height)), max(0, min(y2 + pad_y, height))
        if x2 <= x1 or y2 <= y1:
            return None
        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        identity = f"_{track_id}" if track_id else ""
        path = EVIDENCE_DIR / f"{prefix}{identity}_{uuid4().hex}.jpg"
        if not cv2.imwrite(str(path), frame[y1:y2, x1:x2], [cv2.IMWRITE_JPEG_QUALITY, 90]):
            return None
        return str(path.relative_to(REPOSITORY_ROOT)).replace("\\", "/")
    except Exception:
        logger.exception("Could not save evidence snapshot")
        return None


__all__ = ["save_evidence_snapshot"]
