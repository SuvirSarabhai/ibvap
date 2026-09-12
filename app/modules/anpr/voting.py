"""Rolling, regex-validated plate voting."""

from __future__ import annotations

import re
from collections import Counter, deque

# The project accepts both the original Indian-style demo plates and the
# Belarusian-style test plates in test_videos/car.mp4 (for example 5379MX-4).
PLATE_PATTERNS = (
    # Indian-style: MH12DE1234
    re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$"),
    # Belarusian numeric prefix: 5379MX4
    re.compile(r"^[0-9]{4}[A-Z]{2}[0-9]$"),
    # Short alpha: AI07204 (Eastern Europe 2-letter region + 4-5 digits)
    re.compile(r"^[A-Z]{2}[0-9]{4,5}$"),
    # Generic: 2–3 alpha + 3–6 digits
    re.compile(r"^[A-Z]{2,3}[0-9]{3,6}$"),
    # Liberal catch-all: any 5–9 alphanumeric (last resort)
    re.compile(r"^[A-Z0-9]{5,9}$"),
)


class PlateVoter:
    def __init__(self, max_reads: int = 10, minimum_reads: int = 3):
        self.max_reads = max_reads
        self.minimum_reads = minimum_reads
        self._buffers: dict[str, deque[str]] = {}

    def add_read(self, track_id: str, read: str | None) -> str | None:
        if not read:
            return None
        # Strip everything except alphanumeric — hyphens, spaces, dots
        normalized = re.sub(r"[^A-Z0-9]", "", read.upper())
        if len(normalized) < 4:
            return None
        # Check against known patterns (most specific first, liberal last)
        if not any(pattern.fullmatch(normalized) for pattern in PLATE_PATTERNS):
            return None
        buffer = self._buffers.setdefault(str(track_id), deque(maxlen=self.max_reads))
        buffer.append(normalized)
        if len(buffer) < self.minimum_reads:
            return None
        return Counter(buffer).most_common(1)[0][0]

    def clear(self, track_id: str) -> None:
        self._buffers.pop(str(track_id), None)


def vote_plate(reads: list[str], minimum_reads: int = 3) -> str | None:
    voter = PlateVoter(minimum_reads=minimum_reads)
    result = None
    for read in reads:
        result = voter.add_read("single", read) or result
    return result
