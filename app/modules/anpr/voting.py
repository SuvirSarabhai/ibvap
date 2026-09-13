"""Rolling, configurable-format license plate voting."""

from __future__ import annotations

import re
import time
from collections import Counter, deque

from app.utils.logger import get_logger

logger = get_logger(__name__)

PLATE_FORMAT_GENERIC = "generic"
PLATE_FORMAT_INDIAN = "indian"
PLATE_FORMATS = {PLATE_FORMAT_GENERIC, PLATE_FORMAT_INDIAN}
_INDIAN_PLATE_PATTERN = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$")


def normalize_plate(read: str) -> str:
    """Remove OCR separators and normalize the value used for voting."""
    return re.sub(r"[^A-Z0-9]", "", read.upper())


def _validate_plate(normalized: str, plate_format: str) -> str | None:
    if len(normalized) < 4 or len(normalized) > 10:
        return "length must be between 4 and 10 characters"
    if not re.search(r"[A-Z]", normalized):
        return "must contain at least one letter"
    if not re.search(r"[0-9]", normalized):
        return "must contain at least one digit"
    if plate_format == PLATE_FORMAT_INDIAN and not _INDIAN_PLATE_PATTERN.fullmatch(normalized):
        return "does not match the Indian plate format"
    return None


class PlateVoter:
    def __init__(
        self,
        max_reads: int = 10,
        minimum_reads: int = 3,
        plate_format: str = PLATE_FORMAT_GENERIC,
        fragment_window_seconds: float = 2.0,
    ):
        self.max_reads = max_reads
        self.minimum_reads = minimum_reads
        selected_format = str(plate_format).strip().lower()
        if selected_format not in PLATE_FORMATS:
            logger.warning("Unsupported plate format %r; using generic validation", plate_format)
            selected_format = PLATE_FORMAT_GENERIC
        self.plate_format = selected_format
        self.fragment_window_seconds = max(0.0, float(fragment_window_seconds))
        self._buffers: dict[str, deque[str]] = {}
        self._fragments: dict[str, dict[str, tuple[str, float]]] = {}

    def add_read(self, track_id: str, read: str | None, *, now: float | None = None) -> str | None:
        if not read:
            return None
        track_key = str(track_id)
        current_time = time.monotonic() if now is None else float(now)
        fragments = self._fragments.setdefault(track_key, {})
        for kind, (_, seen_at) in list(fragments.items()):
            if current_time - seen_at > self.fragment_window_seconds:
                fragments.pop(kind, None)

        normalized = normalize_plate(read)
        if re.fullmatch(r"[A-Z]{1,3}", normalized):
            return self._add_fragment(track_key, "letters", normalized, current_time)
        if re.fullmatch(r"[0-9]{3,8}", normalized):
            return self._add_fragment(track_key, "digits", normalized, current_time)

        reason = _validate_plate(normalized, self.plate_format)
        if reason:
            logger.info(
                "ANPR plate read rejected track=%s raw=%r normalized=%r format=%s reason=%s",
                track_id,
                read,
                normalized,
                self.plate_format,
                reason,
            )
            return None
        fragments.clear()
        buffer = self._buffers.setdefault(track_key, deque(maxlen=self.max_reads))
        buffer.append(normalized)
        if len(buffer) < self.minimum_reads:
            return None
        return Counter(buffer).most_common(1)[0][0]

    def _add_fragment(self, track_id: str, kind: str, value: str, now: float) -> str | None:
        fragments = self._fragments.setdefault(track_id, {})
        other_kind = "digits" if kind == "letters" else "letters"
        other = fragments.get(other_kind)
        fragments[kind] = (value, now)
        if other is None or now - other[1] > self.fragment_window_seconds:
            logger.info("ANPR plate fragment pending track=%s kind=%s value=%r", track_id, kind, value)
            return None

        letters = value if kind == "letters" else other[0]
        digits = value if kind == "digits" else other[0]
        combined = f"{letters}{digits}"
        fragments.clear()
        reason = _validate_plate(combined, self.plate_format)
        if reason:
            logger.info(
                "ANPR combined plate rejected track=%s normalized=%r format=%s reason=%s",
                track_id,
                combined,
                self.plate_format,
                reason,
            )
            return None
        logger.info("ANPR plate fragments combined track=%s normalized=%r", track_id, combined)
        buffer = self._buffers.setdefault(track_id, deque(maxlen=self.max_reads))
        buffer.append(combined)
        if len(buffer) < self.minimum_reads:
            return None
        return Counter(buffer).most_common(1)[0][0]

    def clear(self, track_id: str) -> None:
        track_key = str(track_id)
        self._buffers.pop(track_key, None)
        self._fragments.pop(track_key, None)

    def clear_all(self) -> None:
        self._buffers.clear()
        self._fragments.clear()


def vote_plate(
    reads: list[str],
    minimum_reads: int = 3,
    plate_format: str = PLATE_FORMAT_GENERIC,
) -> str | None:
    voter = PlateVoter(minimum_reads=minimum_reads, plate_format=plate_format)
    result = None
    for read in reads:
        result = voter.add_read("single", read) or result
    return result
