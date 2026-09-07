"""License plate crop preprocessing and EasyOCR wrapper."""

from __future__ import annotations

import cv2

from app.utils.logger import get_logger

logger = get_logger(__name__)
_reader = None


def preprocess_plate(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    _, thresholded = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.resize(thresholded, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)


def read_plate(crop) -> list[str]:
    global _reader
    try:
        if _reader is None:
            import easyocr

            _reader = easyocr.Reader(["en"])
        results = _reader.readtext(preprocess_plate(crop))
        return [str(result[1]) for result in results if len(result) >= 2]
    except Exception:
        logger.exception("License plate OCR failed")
        return []
