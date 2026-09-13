"""Run a standalone, reference-embedding face-match demo.

This intentionally bypasses the personnel gallery and alert pipeline.  It is a
small bridge for validating that a known face can produce one normal Event with
evidence in the existing Activity Log.

The previous standalone script is not part of this checkout.  Supply its
REFERENCE_EMBEDDING and TEST_VIDEO_PATH through the module constants, CLI, or
environment variables; this module never invents a reference vector or video.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Iterable

# Allow `python scripts/run_face_match_demo.py ...` from the repository root.
_REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(_REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPOSITORY_ROOT))

import cv2
import numpy as np
from sqlalchemy import and_

from app.db.database import SessionLocal
from app.db.models import EventModel
from app.events.event_store import EventStore
from app.events.schema import Event
from app.modules import face_recognition
from app.utils.image_utils import save_evidence_snapshot
from app.utils.paths import CONFIG_DIR, REPOSITORY_ROOT

logger = logging.getLogger(__name__)

# Kept as the public input contract used by the former console demo.  The
# values are intentionally unset because the original script is unavailable.
REFERENCE_EMBEDDING: np.ndarray | None = None
TEST_VIDEO_PATH: str | None = None
REFERENCE_IDENTITY: str | None = None
REFERENCE_NAME = "Known face"

EVENT_TYPE = "face_match"
DEFAULT_CAMERA_ID = "face-match-demo"
DEFAULT_SIMILARITY_THRESHOLD = 0.55
DEFAULT_MIN_CONSECUTIVE_FRAMES = 1
DEFAULT_APPEARANCE_GAP_FRAMES = 1


@dataclass
class DemoSummary:
    frames_processed: int = 0
    matched_frames: int = 0
    matched_similarity_min: float | None = None
    matched_similarity_max: float | None = None
    status_counts: dict[str, int] = field(
        default_factory=lambda: {
            "matched": 0,
            "unknown": 0,
            "low_quality": 0,
            "unavailable": 0,
        }
    )
    events_created: int = 0
    suppressed_continuous: int = 0
    suppressed_cooldown: int = 0
    evidence_paths: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


@dataclass
class _AppearanceState:
    consecutive_matches: int = 0
    missing_frames: int = 0
    emitted: bool = False


def normalize_reference_embedding(value: Any) -> np.ndarray:
    """Validate and L2-normalize a supplied reference embedding."""
    vector = np.asarray(value, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(vector))
    if vector.size == 0 or not np.isfinite(vector).all() or norm <= 0:
        raise ValueError("reference embedding must be a finite, non-zero vector")
    return vector / norm


def reference_identity(embedding: np.ndarray, explicit: str | None = None) -> str:
    """Return an explicit identity or a stable identity derived from the vector."""
    if explicit and explicit.strip():
        return explicit.strip()
    digest = hashlib.sha256(np.asarray(embedding, dtype=np.float32).tobytes()).hexdigest()
    return f"reference-{digest[:16]}"


def load_reference_embedding(
    *,
    value: Any = None,
    file_path: str | Path | None = None,
    environment: dict[str, str] | None = None,
) -> np.ndarray:
    """Load a reference vector from an explicit value, file, or environment."""
    if value is not None:
        return normalize_reference_embedding(value)

    if file_path:
        path = Path(file_path)
        if path.suffix.lower() == ".npy":
            loaded = np.load(path, allow_pickle=True)
            if isinstance(loaded, np.ndarray) and loaded.shape == ():
                loaded = loaded.item()
            if isinstance(loaded, dict):
                loaded = loaded.get("embedding")
                if loaded is None:
                    raise ValueError("embedding file object must contain an 'embedding' field")
            return normalize_reference_embedding(loaded)
        try:
            loaded = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                loaded = loaded.get("embedding")
                if loaded is None:
                    raise ValueError("embedding file object must contain an 'embedding' field")
            return normalize_reference_embedding(loaded)
        except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
            raise ValueError(f"could not read reference embedding file {path}: {exc}") from exc

    environment = os.environ if environment is None else environment
    raw = environment.get("IBVAP_REFERENCE_EMBEDDING")
    if raw:
        try:
            return normalize_reference_embedding(json.loads(raw))
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            raise ValueError("IBVAP_REFERENCE_EMBEDDING must be a JSON array") from exc

    if REFERENCE_EMBEDDING is not None:
        return normalize_reference_embedding(REFERENCE_EMBEDDING)
    raise ValueError(
        "reference embedding is required; provide --embedding-file, "
        "IBVAP_REFERENCE_EMBEDDING, or set REFERENCE_EMBEDDING"
    )


def resolve_video_path(value: str | Path | None = None) -> Path:
    candidate = value or os.environ.get("IBVAP_TEST_VIDEO_PATH") or TEST_VIDEO_PATH
    if not candidate:
        raise ValueError(
            "test video path is required; provide --video, "
            "IBVAP_TEST_VIDEO_PATH, or set TEST_VIDEO_PATH"
        )
    path = Path(candidate)
    if not path.is_absolute():
        path = REPOSITORY_ROOT / path
    if not path.is_file():
        raise ValueError(f"test video does not exist: {path}")
    return path


def load_alert_cooldown(config_dir: Path = CONFIG_DIR) -> float:
    """Read the existing cooldown setting without constructing an AlertManager."""
    try:
        import yaml

        with (config_dir / "thresholds.yaml").open(encoding="utf-8") as handle:
            values = yaml.safe_load(handle) or {}
        return max(0.0, float(values.get("alert_cooldown_seconds", 60)))
    except (OSError, TypeError, ValueError, UnboundLocalError):
        logger.exception("Could not load alert_cooldown_seconds; using 60 seconds")
        return 60.0
    except Exception:
        logger.exception("Could not parse alert_cooldown_seconds; using 60 seconds")
        return 60.0


def _metadata_reference_matches(row: EventModel, identity: str) -> bool:
    metadata = row.event_metadata or {}
    return str(metadata.get("reference_identity", "")) == identity


def has_recent_matching_event(
    *,
    session_factory: Callable[[], Any],
    camera_id: str,
    identity: str,
    timestamp: datetime,
    cooldown_seconds: float,
) -> bool:
    """Check recent face-match Events for this reference identity.

    The JSON metadata comparison is deliberately done in Python so the query
    works on both SQLite and PostgreSQL without backend-specific JSON syntax.
    """
    if cooldown_seconds < 0:
        cooldown_seconds = 0.0
    cutoff = timestamp - timedelta(seconds=cooldown_seconds)
    session = session_factory()
    try:
        rows = (
            session.query(EventModel)
            .filter(
                and_(
                    EventModel.event_type == EVENT_TYPE,
                    EventModel.camera_id == camera_id,
                    EventModel.timestamp >= cutoff,
                    EventModel.timestamp <= timestamp,
                )
            )
            .order_by(EventModel.timestamp.desc())
            .all()
        )
        return any(_metadata_reference_matches(row, identity) for row in rows)
    finally:
        session.close()


def _crop(frame: Any, bbox: Iterable[float]) -> np.ndarray | None:
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


class FaceMatchDemo:
    """Stateful event bridge with injectable persistence and evidence hooks."""

    def __init__(
        self,
        reference_embedding: Any,
        *,
        reference_identity_value: str | None = None,
        reference_name: str = REFERENCE_NAME,
        camera_id: str = DEFAULT_CAMERA_ID,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
        cooldown_seconds: float = 60.0,
        min_consecutive_frames: int = DEFAULT_MIN_CONSECUTIVE_FRAMES,
        appearance_gap_frames: int = DEFAULT_APPEARANCE_GAP_FRAMES,
        event_store: EventStore | None = None,
        session_factory: Callable[[], Any] = SessionLocal,
        evidence_saver: Callable[..., str | None] = save_evidence_snapshot,
        clock: Callable[[], datetime] | None = None,
    ):
        self.reference_embedding = normalize_reference_embedding(reference_embedding)
        self.reference_identity = reference_identity(
            self.reference_embedding, reference_identity_value
        )
        self.reference_name = reference_name
        self.camera_id = camera_id
        self.similarity_threshold = float(similarity_threshold)
        self.cooldown_seconds = max(0.0, float(cooldown_seconds))
        self.min_consecutive_frames = max(1, int(min_consecutive_frames))
        self.appearance_gap_frames = max(1, int(appearance_gap_frames))
        self.event_store = event_store or EventStore()
        self.session_factory = session_factory
        self.evidence_saver = evidence_saver
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.state = _AppearanceState()
        self.summary = DemoSummary()

    def similarity(self, embedding: Any) -> float:
        vector = normalize_reference_embedding(embedding)
        if vector.shape != self.reference_embedding.shape:
            return 0.0
        return float(np.dot(vector, self.reference_embedding))

    def process_match(
        self,
        frame: Any,
        bbox: Iterable[float],
        similarity: float,
        *,
        status: str = "matched",
        track_id: str = "face-0",
        timestamp: datetime | None = None,
    ) -> Event | None:
        """Process one candidate frame and emit only on an appearance rising edge."""
        current_time = timestamp or self.clock()
        if status not in self.summary.status_counts:
            status = "unknown"
        self.summary.status_counts[status] += 1
        is_match = status == "matched" and float(similarity) >= self.similarity_threshold
        if not is_match:
            self.state.missing_frames += 1
            if self.state.missing_frames >= self.appearance_gap_frames:
                self.state = _AppearanceState()
            return None

        self.summary.matched_frames += 1
        score = float(similarity)
        if self.summary.matched_similarity_min is None:
            self.summary.matched_similarity_min = score
            self.summary.matched_similarity_max = score
        else:
            self.summary.matched_similarity_min = min(self.summary.matched_similarity_min, score)
            self.summary.matched_similarity_max = max(self.summary.matched_similarity_max or score, score)
        self.state.missing_frames = 0
        self.state.consecutive_matches += 1
        if self.state.emitted:
            self.summary.suppressed_continuous += 1
            return None
        if self.state.consecutive_matches < self.min_consecutive_frames:
            return None

        # Mark the appearance as emitted before querying/saving.  This makes a
        # cooldown suppression single-fire too, rather than a database query on
        # every subsequent frame.
        self.state.emitted = True
        if has_recent_matching_event(
            session_factory=self.session_factory,
            camera_id=self.camera_id,
            identity=self.reference_identity,
            timestamp=current_time,
            cooldown_seconds=self.cooldown_seconds,
        ):
            self.summary.suppressed_cooldown += 1
            return None

        # Save the complete frame with a padded face crop.  The source face
        # detector's bbox is already the face region; passing the full frame
        # avoids writing a tiny/degenerate image when a detector returns a
        # malformed or out-of-frame box.
        evidence_path = self.evidence_saver(
            frame, bbox, "face-match", track_id
        )
        if not evidence_path:
            message = f"face-match evidence save failed for {self.reference_identity}"
            logger.error(message)
            self.summary.errors.append(message)
            return None

        event = Event(
            track_id=f"face-match-{self.reference_identity}",
            camera_id=self.camera_id,
            event_type=EVENT_TYPE,
            timestamp=current_time,
            metadata={
                "reference_identity": self.reference_identity,
                "reference_name": self.reference_name,
                "status": "matched",
                "similarity": float(similarity),
                "bbox": [float(value) for value in bbox],
                "source_track_id": str(track_id),
            },
            evidence_path=evidence_path,
            event_description=f"Known face matched — {self.reference_name}",
            event_type_label="Face Match",
            entity_type="person",
            confidence=float(similarity),
            severity="normal",
        )
        saved = self.event_store.save_event(event)
        self.summary.events_created += 1
        self.summary.evidence_paths.append(evidence_path)
        return saved

    def reset_appearance(self) -> None:
        self.state = _AppearanceState()


def _face_candidates(frame: Any, analyzer: Any, settings: dict[str, Any]):
    """Yield quality-gated embeddings using detections from one analyzer call."""
    try:
        faces = analyzer.get(frame)
    except Exception:
        logger.exception("Face detector failed while processing demo frame")
        yield -1, (0.0, 0.0, 0.0, 0.0), "unavailable", None
        return
    for index, face in enumerate(faces or []):
        bbox = tuple(float(value) for value in face.bbox)
        det_score = float(getattr(face, "det_score", 0.0))
        if det_score < float(settings["detection_confidence_threshold"]):
            yield index, bbox, "low_quality", None
            continue
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        if min(width, height) < float(settings["min_face_size_px"]):
            yield index, bbox, "low_quality", None
            continue
        embedding = getattr(face, "normed_embedding", None)
        if embedding is None:
            yield index, bbox, "low_quality", None
            continue
        try:
            vector = np.asarray(embedding, dtype=np.float32).reshape(-1)
            norm = float(np.linalg.norm(vector))
        except (TypeError, ValueError):
            yield index, bbox, "low_quality", None
            continue
        if not norm or not np.isfinite(vector).all():
            yield index, bbox, "low_quality", None
            continue
        yield index, bbox, "ok", vector / norm


def run_video(
    video_path: str | Path,
    reference_embedding: Any,
    *,
    reference_identity_value: str | None = None,
    reference_name: str = REFERENCE_NAME,
    camera_id: str = DEFAULT_CAMERA_ID,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
    cooldown_seconds: float | None = None,
    min_consecutive_frames: int = DEFAULT_MIN_CONSECUTIVE_FRAMES,
    appearance_gap_frames: int = DEFAULT_APPEARANCE_GAP_FRAMES,
    event_store: EventStore | None = None,
    session_factory: Callable[[], Any] = SessionLocal,
    evidence_saver: Callable[..., str | None] = save_evidence_snapshot,
    clock: Callable[[], datetime] | None = None,
) -> DemoSummary:
    """Run a finite video without LatestFrameReader or CameraWorker."""
    path = resolve_video_path(video_path)
    settings = face_recognition._settings()
    if not settings.get("enabled", True):
        raise RuntimeError("face recognition is disabled in config/thresholds.yaml")
    analyzer = face_recognition._load_model(settings)
    demo = FaceMatchDemo(
        reference_embedding,
        reference_identity_value=reference_identity_value,
        reference_name=reference_name,
        camera_id=camera_id,
        similarity_threshold=similarity_threshold,
        cooldown_seconds=load_alert_cooldown() if cooldown_seconds is None else cooldown_seconds,
        min_consecutive_frames=min_consecutive_frames,
        appearance_gap_frames=appearance_gap_frames,
        event_store=event_store,
        session_factory=session_factory,
        evidence_saver=evidence_saver,
        clock=clock,
    )

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"could not open test video: {path}")
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            demo.summary.frames_processed += 1
            candidates = list(_face_candidates(frame, analyzer, settings))
            best: tuple[float, tuple[float, ...], str, np.ndarray] | None = None
            saw_low_quality = False
            saw_unavailable = False
            for index, bbox, status, embedding in candidates:
                if status == "low_quality":
                    saw_low_quality = True
                elif status == "unavailable":
                    saw_unavailable = True
                if status != "ok" or embedding is None:
                    continue
                score = demo.similarity(embedding)
                if best is None or score > best[0]:
                    best = (score, bbox, f"face-{index}", embedding)
            if best is None:
                status = "low_quality" if saw_low_quality else "unavailable" if saw_unavailable else "unknown"
                demo.process_match(frame, (0, 0, 0, 0), 0.0, status=status)
                continue
            score, bbox, track_id, _embedding = best
            if score < demo.similarity_threshold:
                demo.process_match(frame, bbox, score, status="unknown", track_id=track_id)
                continue
            demo.process_match(frame, bbox, score, status="matched", track_id=track_id)
    finally:
        capture.release()
    return demo.summary


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", help="finite test video path")
    parser.add_argument("--embedding-file", help="JSON or .npy reference embedding")
    parser.add_argument("--reference-identity")
    parser.add_argument("--reference-name", default=REFERENCE_NAME)
    parser.add_argument("--camera-id", default=DEFAULT_CAMERA_ID)
    parser.add_argument("--similarity-threshold", type=float, default=DEFAULT_SIMILARITY_THRESHOLD)
    parser.add_argument("--cooldown-seconds", type=float)
    parser.add_argument("--min-consecutive-frames", type=int, default=DEFAULT_MIN_CONSECUTIVE_FRAMES)
    parser.add_argument("--appearance-gap-frames", type=int, default=DEFAULT_APPEARANCE_GAP_FRAMES)
    return parser


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = _parser().parse_args(argv)
    try:
        embedding = load_reference_embedding(file_path=args.embedding_file)
        video = resolve_video_path(args.video)
        summary = run_video(
            video,
            embedding,
            reference_identity_value=args.reference_identity,
            reference_name=args.reference_name,
            camera_id=args.camera_id,
            similarity_threshold=args.similarity_threshold,
            cooldown_seconds=args.cooldown_seconds,
            min_consecutive_frames=args.min_consecutive_frames,
            appearance_gap_frames=args.appearance_gap_frames,
        )
    except (RuntimeError, ValueError, OSError) as exc:
        logger.error("Face-match demo did not run: %s", exc)
        return 2

    logger.info(
        "Face-match summary: frames_processed=%d statuses=%s matched_frames=%d "
        "matched_similarity_range=%s..%s events_created=%d "
        "suppressed_continuous=%d suppressed_cooldown=%d evidence=%s errors=%d",
        summary.frames_processed,
        summary.status_counts,
        summary.matched_frames,
        summary.matched_similarity_min,
        summary.matched_similarity_max,
        summary.events_created,
        summary.suppressed_continuous,
        summary.suppressed_cooldown,
        summary.evidence_paths,
        len(summary.errors),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
