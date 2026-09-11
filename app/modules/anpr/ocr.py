"""License plate crop preprocessing and EasyOCR wrapper."""

from __future__ import annotations

import re
import cv2

from app.utils.logger import get_logger

logger = get_logger(__name__)
_reader = None

# Cyrillic → Latin lookalike mapping for plate normalisation
_CYR_TO_LAT = str.maketrans("АВСЕЗКМНОРСТУХ", "AVCE3KMNORCTYX")


def _normalise(text: str) -> str:
    """Upper-case, strip spaces/dashes, map Cyrillic lookalikes to Latin."""
    text = text.upper().translate(_CYR_TO_LAT)
    # Keep only alphanumeric + hyphen
    text = re.sub(r"[^A-Z0-9\-]", "", text)
    return text.strip("-")


def preprocess_plate(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    # Upscale, then Otsu threshold
    upscaled = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _, thresholded = cv2.threshold(upscaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresholded


def read_plate(crop) -> list[str]:
    global _reader
    if crop is None or crop.size == 0:
        return []
    try:
        if _reader is None:
            import easyocr
            # Include Russian so Cyrillic plates (e.g. Eastern Europe) are read correctly.
            # EasyOCR will normalise them in _normalise() below.
            _reader = easyocr.Reader(["en", "ru"], gpu=False)
        results = _reader.readtext(preprocess_plate(crop), detail=1)
        plates = []
        for (_, text, conf) in results:
            if conf < 0.3:
                continue
            normalised = _normalise(text)
            if len(normalised) >= 4:  # ignore very short noise reads
                plates.append(normalised)
        return plates
    except Exception:
        logger.exception("License plate OCR failed")
        return []
