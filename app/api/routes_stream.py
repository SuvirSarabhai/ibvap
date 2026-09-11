"""Video file streaming endpoint — serves test_videos/* with byte-range support."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api", tags=["stream"])

# Resolve once at import time — works regardless of cwd
_TEST_VIDEOS_DIR = Path(__file__).resolve().parents[2] / "test_videos"

# Only expose files already in test_videos (no path traversal)
_ALLOWED_EXTENSIONS = {".mp4", ".mkv", ".avi", ".webm"}


def _iter_file(path: Path, start: int, end: int, chunk: int = 1 << 20):
    with open(path, "rb") as f:
        f.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            data = f.read(min(chunk, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data


@router.get("/stream/{filename}")
def stream_video(filename: str, request: Request):
    """
    Stream a file from test_videos/ with HTTP 206 byte-range support.
    The browser <video> element will use this to seek and play.
    """
    # Safety: reject any path traversal attempt
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    path = _TEST_VIDEOS_DIR / filename

    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail=f"Video not found: {filename}")

    if path.suffix.lower() not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file_size = path.stat().st_size
    range_header = request.headers.get("range")

    # MIME type map
    mime = {
        ".mp4": "video/mp4",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".webm": "video/webm",
    }.get(path.suffix.lower(), "video/mp4")

    if range_header:
        # Parse "bytes=start-end"
        try:
            range_val = range_header.strip().replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        except (ValueError, AttributeError):
            raise HTTPException(status_code=416, detail="Invalid Range header")

        if start >= file_size or end >= file_size or start > end:
            raise HTTPException(status_code=416, detail="Range Not Satisfiable")

        content_length = end - start + 1
        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": mime,
        }
        return StreamingResponse(
            _iter_file(path, start, end),
            status_code=206,
            headers=headers,
            media_type=mime,
        )

    # Full file response (no Range header)
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": mime,
    }
    return StreamingResponse(
        _iter_file(path, 0, file_size - 1),
        status_code=200,
        headers=headers,
        media_type=mime,
    )
