"""Evidence snapshot helper."""

from __future__ import annotations

from uuid import uuid4

import cv2

from app.utils.logger import get_logger
from app.utils.paths import EVIDENCE_DIR, REPOSITORY_ROOT

logger = get_logger(__name__)


def save_evidence_snapshot(
    frame,
    bbox=None,
    prefix: str = "snapshot",
    track_id: str | None = None,
) -> str | None:
    """Save the full frame with an optional entity bounding-box overlay."""
    if frame is None:
        return None
    try:
        height, width = frame.shape[:2]
        evidence = frame.copy()
        if bbox is not None:
            x1, y1, x2, y2 = (int(value) for value in bbox)
            x1 = max(0, min(x1, width - 1))
            y1 = max(0, min(y1, height - 1))
            x2 = max(0, min(x2, width - 1))
            y2 = max(0, min(y2, height - 1))
            if x2 <= x1 or y2 <= y1:
                return None
            cv2.rectangle(evidence, (x1, y1), (x2, y2), (0, 0, 255), 3)
        EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
        identity = f"_{track_id}" if track_id else ""
        path = EVIDENCE_DIR / f"{prefix}{identity}_{uuid4().hex}.jpg"
        if not cv2.imwrite(str(path), evidence, [cv2.IMWRITE_JPEG_QUALITY, 90]):
            return None
        return str(path.relative_to(REPOSITORY_ROOT)).replace("\\", "/")
    except Exception:
        logger.exception("Could not save evidence snapshot")
        return None


__all__ = ["save_evidence_snapshot"]
