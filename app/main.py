"""FastAPI application entry point."""

from __future__ import annotations

from dotenv import load_dotenv
load_dotenv()  # loads .env before SQLAlchemy engine is created

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.routes_alerts import router as alerts_router
from app.api.routes_cameras import router as cameras_router
from app.api.routes_events import router as events_router
from app.api.websocket import router as websocket_router
from app.db.database import init_db
from app.pipeline.orchestrator import start_orchestrator, stop_orchestrator


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    start_orchestrator(show_window=False)
    try:
        yield
    finally:
        stop_orchestrator()


app = FastAPI(title="IBVAP Backend", version="0.1.0", lifespan=lifespan)
app.include_router(events_router)
app.include_router(alerts_router)
app.include_router(cameras_router)
app.include_router(websocket_router)


@app.get("/health")
def health():
    return {"status": "ok"}
