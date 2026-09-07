"""Thin YOLO tracking wrapper used by camera workers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class Detection:
    track_id: str
    class_name: str
    bbox: tuple[int, int, int, int]
    confidence: float


class ObjectDetector:
    """Load YOLO once and expose normalized tracked detections."""

    def __init__(self, model_path: str = "yolov8n.pt"):
        from ultralytics import YOLO

        self.model = YOLO(model_path)
        self.class_names = self.model.names

    def detect_and_track(self, frame: np.ndarray) -> list[Detection]:
        try:
            results = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                verbose=False,
            )
        except Exception:
            logger.exception("YOLO detection failed")
            return []

        detections: list[Detection] = []
        for result in results or []:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            xyxy = getattr(boxes, "xyxy", None)
            confidence_values = getattr(boxes, "conf", None)
            class_values = getattr(boxes, "cls", None)
            id_values = getattr(boxes, "id", None)
            if xyxy is None:
                continue
            xyxy_list = xyxy.cpu().tolist() if hasattr(xyxy, "cpu") else xyxy.tolist()
            conf_list = (
                confidence_values.cpu().tolist()
                if hasattr(confidence_values, "cpu")
                else (confidence_values.tolist() if confidence_values is not None else [])
            )
            class_list = (
                class_values.cpu().tolist()
                if hasattr(class_values, "cpu")
                else (class_values.tolist() if class_values is not None else [])
            )
            id_list = None
            if id_values is not None:
                id_list = id_values.cpu().tolist() if hasattr(id_values, "cpu") else id_values.tolist()

            for index, coordinates in enumerate(xyxy_list):
                if len(coordinates) != 4:
                    continue
                class_index = int(class_list[index]) if index < len(class_list) else -1
                class_name: Any = self.class_names
                if isinstance(self.class_names, dict):
                    class_name = self.class_names.get(class_index, str(class_index))
                elif 0 <= class_index < len(self.class_names):
                    class_name = self.class_names[class_index]
                track_id = (
                    str(int(id_list[index]))
                    if id_list is not None and index < len(id_list) and id_list[index] is not None
                    else f"untracked-{index}"
                )
                detections.append(
                    Detection(
                        track_id=track_id,
                        class_name=str(class_name),
                        bbox=tuple(int(round(value)) for value in coordinates),
                        confidence=float(conf_list[index]) if index < len(conf_list) else 0.0,
                    )
                )
        return detections

    # Keep the shorter name available for callers that prefer the plan's interface.
    detect = detect_and_track
