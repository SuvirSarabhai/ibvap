"""Seed a restricted plate for local demonstrations."""

from __future__ import annotations

import argparse

from app.db.database import SessionLocal, init_db
from app.db.models import WatchlistModel


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("plate", nargs="?", default="AB12C3456")
    args = parser.parse_args()
    init_db()
    with SessionLocal() as session:
        row = session.get(WatchlistModel, args.plate.upper())
        if row is None:
            session.add(WatchlistModel(plate=args.plate.upper(), status="restricted", note="Demo restricted vehicle"))
        else:
            row.status = "restricted"
        session.commit()
    print(f"Seeded restricted plate: {args.plate.upper()}")


if __name__ == "__main__":
    main()
