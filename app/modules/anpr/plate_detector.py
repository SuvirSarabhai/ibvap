"""License plate detector using a HuggingFace-hosted YOLOv8 model.

Model: Koushim/yolov8-license-plate-detection
Loaded once via hf_hub_download (cached locally after first run).
Falls back to cropping the vehicle bbox if the download fails.
"""

from __future__ import annotations

from app.utils.logger import get_logger

logger = get_logger(__name__)

_HF_REPO = "Koushim/yolov8-license-plate-detection"
_HF_FILENAME = "best.pt"


class PlateDetector:
    def __init__(self):
        self.model = None
        try:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO

            model_path = hf_hub_download(repo_id=_HF_REPO, filename=_HF_FILENAME)
            self.model = YOLO(model_path)
            logger.info("Plate detection model loaded from HuggingFace (%s)", _HF_REPO)
        except Exception:
            logger.exception(
                "Could not load plate model from HuggingFace; "
                "falling back to vehicle bbox crop (lower accuracy)"
            )

    def detect(self, frame, vehicle_bbox):
        """Return the best plate crop for a given vehicle bounding box."""
        x1, y1, x2, y2 = (int(v) for v in vehicle_bbox)
        if self.model is None:
            # Fallback: pass the whole vehicle region to OCR.
            return frame[max(0, y1) : max(0, y2), max(0, x1) : max(0, x2)]
        try:
            results = self.model(frame, verbose=False)
            for result in results or []:
                boxes = getattr(result, "boxes", None)
                if boxes is not None and len(boxes.xyxy):
                    coords = boxes.xyxy[0].cpu().tolist()
                    px1, py1, px2, py2 = (int(v) for v in coords)
                    return frame[max(0, py1) : max(0, py2), max(0, px1) : max(0, px2)]
        except Exception:
            logger.exception("Plate detection inference failed; using vehicle crop fallback")
        return frame[max(0, y1) : max(0, y2), max(0, x1) : max(0, x2)]
