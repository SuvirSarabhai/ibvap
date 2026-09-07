"""WebSocket endpoint and alert broadcast bridge."""

from __future__ import annotations

import asyncio
import json
import threading
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
_connections: set[WebSocket] = set()
_connections_lock = threading.Lock()
_main_loop: asyncio.AbstractEventLoop | None = None


def _serialize(alert: Any) -> str:
    payload = alert.model_dump(mode="json") if hasattr(alert, "model_dump") else alert
    return json.dumps(payload)


def publish(alert: Any) -> None:
    """Schedule a broadcast from either an API task or a worker thread."""
    with _connections_lock:
        connections = list(_connections)
    if not connections:
        return
    message = _serialize(alert)
    loop = _main_loop
    if loop is None or loop.is_closed():
        return
    asyncio.run_coroutine_threadsafe(_broadcast(message, connections), loop)


async def _broadcast(message: str, connections: list[WebSocket]) -> None:
    stale: list[WebSocket] = []
    for connection in connections:
        try:
            await connection.send_text(message)
        except Exception:
            stale.append(connection)
    if stale:
        with _connections_lock:
            for connection in stale:
                _connections.discard(connection)


@router.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket) -> None:
    global _main_loop
    await websocket.accept()
    _main_loop = asyncio.get_running_loop()
    with _connections_lock:
        _connections.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        with _connections_lock:
            _connections.discard(websocket)
