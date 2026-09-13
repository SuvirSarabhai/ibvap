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
    """Upper-case and remove OCR separators/noise from a plate candidate."""
    text = text.upper().translate(_CYR_TO_LAT)
    # Spaces, slashes, pipes, and dashes can separate stacked plate lines.
    return re.sub(r"[^A-Z0-9]", "", text)


def _is_fragment(normalised: str) -> bool:
    """Return whether a short alpha/numeric OCR result may be assembled later."""
    return bool(
        re.fullmatch(r"[A-Z]{1,3}", normalised)
        or re.fullmatch(r"[0-9]{3,8}", normalised)
    )


def preprocess_plate(crop):
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop
    # Upscale, then Otsu threshold
    upscaled = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _, thresholded = cv2.threshold(upscaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresholded


def read_plate(crop, *, camera_id: str | None = None, track_id: str | None = None) -> list[str]:
    global _reader
    if crop is None or crop.size == 0:
        logger.info("ANPR OCR skipped camera=%s track=%s reason=empty_crop", camera_id, track_id)
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
            logger.info(
                "ANPR OCR raw read camera=%s track=%s text=%r confidence=%.3f",
                camera_id,
                track_id,
                text,
                conf,
            )
            if conf < 0.3:
                logger.info(
                    "ANPR OCR read discarded camera=%s track=%s raw=%r reason=low_confidence",
                    camera_id,
                    track_id,
                    text,
                )
                continue
            normalised = _normalise(text)
            if len(normalised) >= 4 or _is_fragment(normalised):
                plates.append(normalised)
                if len(normalised) < 4:
                    logger.info(
                        "ANPR OCR fragment retained camera=%s track=%s raw=%r normalized=%r",
                        camera_id,
                        track_id,
                        text,
                        normalised,
                    )
            else:
                logger.info(
                    "ANPR OCR read discarded camera=%s track=%s raw=%r normalized=%r reason=too_short",
                    camera_id,
                    track_id,
                    text,
                    normalised,
                )
        return plates
    except Exception:
        logger.exception("License plate OCR failed camera=%s track=%s", camera_id, track_id)
        return []
