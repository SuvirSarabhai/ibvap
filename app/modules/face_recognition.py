"""Local InsightFace adapter with explicit quality and uncertainty states."""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import yaml

from app.db.database import SessionLocal
from app.db.models import FaceEmbeddingModel, PersonnelModel
from app.utils.paths import CONFIG_DIR

DEFAULTS = {
    "enabled": True,
    "model_name": "buffalo_l",
    # Starting default; tune empirically against real enrollment photos.
    "similarity_threshold": 0.55,
    "min_face_size_px": 40,
    "blur_threshold": 100.0,
    "detection_confidence_threshold": 0.5,
}
_MODEL_LOCK = threading.Lock()
_MODEL = None
_MODEL_NAME = None


def _settings() -> dict[str, Any]:
    try:
        with (CONFIG_DIR / "thresholds.yaml").open(encoding="utf-8") as handle:
            configured = (yaml.safe_load(handle) or {}).get("face_recognition", {})
    except (OSError, yaml.YAMLError):
        configured = {}
    return {**DEFAULTS, **configured}


def _unavailable() -> dict[str, str | float | None]:
    return {"status": "unavailable", "person_id": None, "display_name": None, "similarity": 0.0}


def _result(status: str, person_id: str | None = None, display_name: str | None = None, similarity: float = 0.0):
    return {
        "status": status,
        "person_id": person_id,
        "display_name": display_name,
        "similarity": float(similarity),
    }


def _load_model(settings: dict[str, Any]):
    global _MODEL, _MODEL_NAME
    model_name = str(settings["model_name"])
    with _MODEL_LOCK:
        if _MODEL is None or _MODEL_NAME != model_name:
            from insightface.app import FaceAnalysis

            _MODEL = FaceAnalysis(name=model_name, providers=["CPUExecutionProvider"])
            _MODEL.prepare(ctx_id=0, det_size=(640, 640))
            _MODEL_NAME = model_name
        return _MODEL


def _crop(frame, bbox):
    if frame is None or bbox is None:
        return None
    try:
        height, width = frame.shape[:2]
        x1, y1, x2, y2 = (int(value) for value in bbox)
    except (AttributeError, TypeError, ValueError):
        return None
    x1, x2 = max(0, x1), min(width, x2)
    y1, y2 = max(0, y1), min(height, y2)
    if x2 <= x1 or y2 <= y1:
        return None
    return frame[y1:y2, x1:x2]


def extract_embedding(image, *, settings: dict[str, Any] | None = None) -> tuple[str, np.ndarray | None]:
    """Return a quality-gated normalized embedding without persisting image data."""
    settings = settings or _settings()
    if not settings.get("enabled", True):
        return "unavailable", None
    if image is None or getattr(image, "size", 0) == 0:
        return "unavailable", None
    try:
        faces = _load_model(settings).get(image)
    except Exception:
        return "unavailable", None
    if not faces:
        return "unavailable", None
    face = max(faces, key=lambda item: float(item.bbox[2] - item.bbox[0]) * float(item.bbox[3] - item.bbox[1]))
    x1, y1, x2, y2 = [float(value) for value in face.bbox]
    face_width, face_height = x2 - x1, y2 - y1
    if float(getattr(face, "det_score", 0.0)) < float(settings["detection_confidence_threshold"]):
        return "low_quality", None
    if min(face_width, face_height) < float(settings["min_face_size_px"]):
        return "low_quality", None
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if float(settings.get("blur_threshold", 0.0)) > 0 and float(cv2.Laplacian(gray, cv2.CV_64F).var()) < float(settings["blur_threshold"]):
        return "low_quality", None
    embedding = getattr(face, "normed_embedding", None)
    if embedding is None:
        return "low_quality", None
    vector = np.asarray(embedding, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(vector))
    if not norm or not np.isfinite(vector).all():
        return "low_quality", None
    return "ok", vector / norm


def _active_gallery(session):
    rows = session.query(FaceEmbeddingModel, PersonnelModel).join(
        PersonnelModel, FaceEmbeddingModel.person_id == PersonnelModel.person_id
    ).filter(FaceEmbeddingModel.active.is_(True), PersonnelModel.active.is_(True)).all()
    gallery = []
    for embedding, person in rows:
        try:
            vector = np.asarray(embedding.embedding, dtype=np.float32).reshape(-1)
            norm = float(np.linalg.norm(vector))
            if norm and np.isfinite(vector).all():
                gallery.append((person, vector / norm))
        except (TypeError, ValueError):
            continue
    return gallery


def match_face(track_id: str, frame, bbox) -> dict[str, str | float | None]:
    """Detect, quality-gate, and match a face against active enrolled embeddings."""
    del track_id
    settings = _settings()
    if not settings.get("enabled", True):
        return _unavailable()
    crop = _crop(frame, bbox)
    status, live_embedding = extract_embedding(crop, settings=settings)
    if status == "unavailable":
        return _unavailable()
    if status != "ok" or live_embedding is None:
        return _result("low_quality")
    session = SessionLocal()
    try:
        best_person = None
        best_similarity = 0.0
        for person, enrolled in _active_gallery(session):
            if enrolled.shape != live_embedding.shape:
                continue
            similarity = float(np.dot(live_embedding, enrolled))
            if similarity > best_similarity:
                best_similarity = similarity
                best_person = person
        if best_person is not None and best_similarity >= float(settings["similarity_threshold"]):
            return _result("matched", best_person.person_id, best_person.display_name, best_similarity)
        return _result("unknown", similarity=best_similarity)
    finally:
        session.close()


def embedding_to_json(embedding: np.ndarray) -> list[float]:
    return [float(value) for value in np.asarray(embedding, dtype=np.float32).reshape(-1)]


__all__ = ["embedding_to_json", "extract_embedding", "match_face"]
