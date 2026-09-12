"""FastAPI application entry point."""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()  # loads .env before SQLAlchemy engine is created

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_alerts import router as alerts_router
from app.api.routes_incidents import router as incidents_router
from app.api.routes_summary import router as summary_router
from app.api.routes_cameras import router as cameras_router
from app.api.routes_events import router as events_router
from app.api.routes_evidence import router as evidence_router
from app.api.routes_personnel import router as personnel_router
from app.api.routes_stream import router as stream_router
from app.api.websocket import router as websocket_router
from app.db.database import init_db
from app.pipeline.orchestrator import start_orchestrator, stop_orchestrator, sync_camera_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    sync_camera_models()
    start_orchestrator(show_window=False)
    try:
        yield
    finally:
        stop_orchestrator()


app = FastAPI(title="IBVAP Backend", version="0.1.0", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
    max_age=3600,
)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(incidents_router)
app.include_router(summary_router)
app.include_router(cameras_router)
app.include_router(evidence_router)
app.include_router(personnel_router)
app.include_router(stream_router)
app.include_router(websocket_router)


@app.get("/health")
def health():
    return {"status": "ok"}
