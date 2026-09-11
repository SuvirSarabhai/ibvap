"""SQLAlchemy engine and session helpers.

Set DATABASE_URL in .env to use PostgreSQL:
    DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/ibvap

Falls back to local SQLite only if DATABASE_URL is not set.
"""

from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.utils.paths import DATABASE_PATH


class Base(DeclarativeBase):
    pass


# Read from env; fall back to SQLite for local dev without Postgres.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite:///{DATABASE_PATH.as_posix()}",
)

# SQLite needs check_same_thread=False; Postgres does not accept it.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db() -> None:
    from app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    # create_all does not alter existing installations; add only the new nullable columns.
    additions = {
        "events": {
            "event_description": "TEXT",
            "event_type_label": "VARCHAR(100)",
            "entity_type": "VARCHAR(30)",
            "confidence": "FLOAT",
            "threat_score": "INTEGER DEFAULT 0",
            "severity": "VARCHAR(20) DEFAULT 'normal'",
            "status": "VARCHAR(30) DEFAULT 'open'",
        },
        "alerts": {
            "entity_id": "VARCHAR(100)",
            "entity_type": "VARCHAR(30)",
            "event_description": "TEXT",
            "event_type_label": "VARCHAR(100)",
            "threat_score": "INTEGER DEFAULT 0",
            "zone_id": "VARCHAR(100)",
            "assigned_to": "VARCHAR(100)",
        },
    }
    with engine.begin() as connection:
        inspector = inspect(connection)
        for table, columns in additions.items():
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, definition in columns.items():
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {definition}'))
                    existing.add(name)
