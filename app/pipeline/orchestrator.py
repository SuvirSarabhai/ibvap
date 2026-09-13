"""Start and stop one worker per configured camera."""

from __future__ import annotations

import threading
from pathlib import Path

import yaml

from app.db.database import SessionLocal
from app.db.models import CameraModel
from app.pipeline.camera_worker import CameraWorker


def sync_camera_models(cameras: list[dict] | None = None) -> None:
    """Upsert configured cameras so summary counts match the active config."""
    session = SessionLocal()
    try:
        for camera in cameras if cameras is not None else load_camera_config():
            camera_id = str(camera.get("camera_id", "camera-unknown"))
            source = str(camera.get("source", ""))
            row = session.get(CameraModel, camera_id)
            if row is None:
                session.add(CameraModel(camera_id=camera_id, source=source, status="offline"))
            elif row.source != source:
                row.source = source
        session.commit()
    finally:
        session.close()
from app.utils.paths import CONFIG_DIR, REPOSITORY_ROOT

_workers: dict[str, CameraWorker] = {}
_threads: dict[str, threading.Thread] = {}


def load_camera_config() -> list[dict]:
    path = CONFIG_DIR / "cameras.yaml"
    try:
        with path.open(encoding="utf-8") as config_file:
            return (yaml.safe_load(config_file) or {}).get("cameras", [])
    except (OSError, yaml.YAMLError):
        return []


def _source_path(source: str) -> str:
    path = Path(source)
    return str(path if path.is_absolute() else REPOSITORY_ROOT / path)


def start_orchestrator(show_window: bool = False) -> None:
    for camera in load_camera_config():
        camera_id = str(camera.get("camera_id", "camera-unknown"))
        if camera_id in _threads and _threads[camera_id].is_alive():
            continue
        worker = CameraWorker(camera_id, _source_path(str(camera.get("source", ""))), show_window=show_window)
        thread = threading.Thread(target=worker.run, name=f"camera-worker-{camera_id}", daemon=True)
        _workers[camera_id] = worker
        _threads[camera_id] = thread
        thread.start()


def stop_orchestrator() -> None:
    for worker in _workers.values():
        worker.stop()
    for thread in _threads.values():
        thread.join(timeout=2)
    _workers.clear()
    _threads.clear()


def get_camera_status() -> list[dict]:
    result = []
    for camera in load_camera_config():
        camera_id = str(camera.get("camera_id", "camera-unknown"))
        worker = _workers.get(camera_id)
        result.append(
            {
                "camera_id": camera_id,
                "name": camera.get("name") or camera_id.replace("-", " ").title(),
                "source": camera.get("source"),
                "zones": camera.get("zones", []),
                "status": "online" if worker and worker.online else "offline",
            }
        )
    return result
