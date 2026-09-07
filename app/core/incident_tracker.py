"""Continuous-condition state machine shared by analytics modules."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable


@dataclass
class _ConditionState:
    start_time: float
    frame_count: int = 0
    fired: bool = False


class IncidentTracker:
    def __init__(self, clock: Callable[[], float] | None = None):
        self._clock = clock or time.monotonic
        self._states: dict[tuple[str, str], _ConditionState] = {}

    def check_persistence(
        self,
        track_id: str,
        condition_name: str,
        condition_true: bool,
        frame_threshold: int | None = None,
        time_threshold: float | None = None,
    ) -> bool:
        if frame_threshold is None and time_threshold is None:
            raise ValueError("frame_threshold or time_threshold is required")
        if frame_threshold is not None and frame_threshold < 1:
            raise ValueError("frame_threshold must be at least 1")
        if time_threshold is not None and time_threshold < 0:
            raise ValueError("time_threshold cannot be negative")

        key = (str(track_id), condition_name)
        if not condition_true:
            self._states.pop(key, None)
            return False

        now = self._clock()
        state = self._states.get(key)
        if state is None:
            state = _ConditionState(start_time=now)
            self._states[key] = state
        state.frame_count += 1

        frame_met = frame_threshold is not None and state.frame_count >= frame_threshold
        time_met = time_threshold is not None and now - state.start_time >= time_threshold
        if (frame_met or time_met) and not state.fired:
            state.fired = True
            return True
        return False

    def reset(self, track_id: str | None = None, condition_name: str | None = None) -> None:
        if track_id is None and condition_name is None:
            self._states.clear()
            return
        for key in list(self._states):
            if (track_id is None or key[0] == str(track_id)) and (
                condition_name is None or key[1] == condition_name
            ):
                self._states.pop(key, None)

    def reset_track(self, track_id: str) -> None:
        """Reset every condition for a track that is no longer visible."""
        self.reset(track_id=track_id)
