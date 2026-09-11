"""Threaded reader that exposes the newest available video frame."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.utils.logger import get_logger

logger = get_logger(__name__)


class LatestFrameReader:
    """Read a camera or video source without making consumers wait for FPS."""

    def __init__(self, source: str | Path):
        self.source = str(source)
        self._capture: Optional[cv2.VideoCapture] = None
        self._frame: Optional[np.ndarray] = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._opened = False
        self._finished = False
        self._sequence = 0
        self._loop_count = 0

    def start(self) -> "LatestFrameReader":
        if self._thread and self._thread.is_alive():
            return self
        self._capture = cv2.VideoCapture(self.source)
        self._opened = bool(self._capture.isOpened())
        if not self._opened:
            logger.error("Could not open video source: %s", self.source)
            self._capture.release()
            self._capture = None
            return self
        self._stop_event.clear()
        self._finished = False
        self._thread = threading.Thread(
            target=self._read_loop,
            name=f"frame-reader-{self.source}",
            daemon=True,
        )
        self._thread.start()
        return self

    def _is_live_stream(self) -> bool:
        """Return True for RTSP/HTTP streams that cannot be seeked."""
        lower = self.source.lower()
        return lower.startswith("rtsp://") or lower.startswith("http://") or lower.startswith("https://")

    def _read_loop(self) -> None:
        assert self._capture is not None
        while not self._stop_event.is_set():
            ok, frame = self._capture.read()
            if not ok:
                if self._is_live_stream():
                    if not self._stop_event.is_set():
                        logger.info("Video source ended or read failed: %s", self.source)
                    self._finished = True
                    break
                # Local file — loop back to the start for continuous testing.
                self._loop_count += 1
                self._capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue
            with self._lock:
                self._frame = frame
                self._sequence += 1
        self._opened = False

    @property
    def finished(self) -> bool:
        return self._finished

    @property
    def loop_count(self) -> int:
        """How many times the local video has looped. Always 0 for live streams."""
        return self._loop_count

    @property
    def frame_sequence(self) -> int:
        with self._lock:
            return self._sequence

    def get(self) -> Optional[np.ndarray]:
        """Return the latest frame, or ``None`` before one is available."""
        with self._lock:
            if self._frame is None:
                return None
            return self._frame.copy()

    @property
    def is_open(self) -> bool:
        return self._opened and not self._stop_event.is_set()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        if self._capture is not None:
            self._capture.release()
        self._capture = None
        self._opened = False

    def __enter__(self) -> "LatestFrameReader":
        return self.start()

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        self.stop()
