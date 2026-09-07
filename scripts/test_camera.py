"""Run one configured camera against a local video for manual verification."""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml

from app.pipeline.camera_worker import run_camera
from app.utils.paths import CONFIG_DIR, REPOSITORY_ROOT


def configured_source() -> tuple[str, str]:
    config_path = CONFIG_DIR / "cameras.yaml"
    with config_path.open(encoding="utf-8") as config_file:
        config = yaml.safe_load(config_file) or {}
    camera = (config.get("cameras") or [{}])[0]
    source = str(camera.get("source", "test_videos/sample.mp4"))
    source_path = Path(source)
    if not source_path.is_absolute():
        source_path = REPOSITORY_ROOT / source_path
    return str(source_path), str(camera.get("camera_id", "camera-1"))


def main() -> None:
    default_source, default_camera = configured_source()
    parser = argparse.ArgumentParser()
    parser.add_argument("source", nargs="?", default=default_source)
    parser.add_argument("--camera-id", default=default_camera)
    parser.add_argument("--no-window", action="store_true")
    args = parser.parse_args()
    run_camera(args.source, args.camera_id, show_window=not args.no_window)


if __name__ == "__main__":
    main()
