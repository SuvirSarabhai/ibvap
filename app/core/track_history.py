"""Bounded image-space track history and smoothed speed estimates."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
import math
import time


@dataclass(frozen=True)
class TrackPoint:
    timestamp: float
    x: float
    y: float


class TrackHistory:
    def __init__(self, max_seconds: float = 30.0, max_points: int = 120, clock=None):
        self.max_seconds = float(max_seconds)
        self.max_points = int(max_points)
        self.clock = clock or time.monotonic
        self._tracks: dict[str, deque[TrackPoint]] = defaultdict(
            lambda: deque(maxlen=self.max_points)
        )

    def update(self, track_id: str, x: float, y: float, timestamp: float | None = None) -> float:
        now = self.clock() if timestamp is None else float(timestamp)
        points = self._tracks[str(track_id)]
        points.append(TrackPoint(now, float(x), float(y)))
        cutoff = now - self.max_seconds
        while points and points[0].timestamp < cutoff:
            points.popleft()
        return self.speed(track_id)

    def speed(self, track_id: str, window: int = 4) -> float:
        points = self._tracks.get(str(track_id))
        if not points or len(points) < 2:
            return 0.0
        recent = list(points)[-max(2, int(window)):]
        speeds = []
        for first, second in zip(recent, recent[1:]):
            elapsed = second.timestamp - first.timestamp
            if elapsed > 0:
                speeds.append(math.hypot(second.x - first.x, second.y - first.y) / elapsed)
        return sum(speeds) / len(speeds) if speeds else 0.0

    def clear(self, track_id: str | None = None) -> None:
        if track_id is None:
            self._tracks.clear()
        else:
            self._tracks.pop(str(track_id), None)


__all__ = ["TrackHistory", "TrackPoint"]
