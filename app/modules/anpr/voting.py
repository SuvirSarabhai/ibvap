"""Rolling, regex-validated plate voting."""

from __future__ import annotations

import re
from collections import Counter, deque

PLATE_PATTERN = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$")


class PlateVoter:
    def __init__(self, max_reads: int = 10, minimum_reads: int = 3):
        self.max_reads = max_reads
        self.minimum_reads = minimum_reads
        self._buffers: dict[str, deque[str]] = {}

    def add_read(self, track_id: str, read: str | None) -> str | None:
        if not read:
            return None
        normalized = re.sub(r"[^A-Z0-9]", "", read.upper())
        if not PLATE_PATTERN.fullmatch(normalized):
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
