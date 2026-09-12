"""Shared personnel authorization decisions for zone-aware analytics."""

from __future__ import annotations

from typing import Any, Callable

from app.db.database import SessionLocal
from app.db.models import PersonnelModel


def _person_id(face_match_result: Any) -> str | None:
    if not isinstance(face_match_result, dict) or face_match_result.get("status") != "matched":
        return None
    value = face_match_result.get("person_id")
    return str(value) if value else None


def authorization_reason(outcome: str) -> str | None:
    if outcome == "unauthorized":
        return "Unauthorized person in restricted zone"
    if outcome == "unresolved":
        return "Identity unresolved — in restricted zone"
    return None


def check_authorization(
    track_id: str,
    zone_id: str,
    face_match_result: dict[str, Any] | None,
    *,
    session_factory: Callable = SessionLocal,
) -> dict[str, str | None]:
    """Return authorization for a matched person in a configured zone.

    A missing face match, unknown person, or malformed personnel record is
    intentionally unresolved.  The caller can then treat uncertainty as a
    security signal without ever granting access by default.
    """
    del track_id  # Reserved for future per-track recognition correlation.
    person_id = _person_id(face_match_result)
    if person_id is None:
        return {"outcome": "unresolved", "person_id": None}

    session = session_factory()
    try:
        person = session.get(PersonnelModel, person_id)
        if person is None or not person.active:
            return {"outcome": "unresolved", "person_id": person_id}
        allowed_zones = person.allowed_zones or []
        if isinstance(allowed_zones, dict):
            allowed_zones = allowed_zones.get("zones", [])
        allowed = {str(value) for value in allowed_zones if value is not None}
        outcome = "authorized" if str(zone_id) in allowed else "unauthorized"
        return {"outcome": outcome, "person_id": person_id}
    finally:
        session.close()


__all__ = ["check_authorization"]
