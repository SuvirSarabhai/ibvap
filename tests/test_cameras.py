from pathlib import Path

from app.pipeline.orchestrator import load_camera_config


def test_all_demo_videos_are_configured():
    configured_sources = {
        str(camera.get("source", "")).replace("\\", "/").split("/")[-1]
        for camera in load_camera_config()
    }
    video_files = {
        path.name
        for path in Path("test_videos").iterdir()
        if path.suffix.lower() in {".mp4", ".mkv", ".avi", ".webm"}
    }
    assert video_files <= configured_sources
