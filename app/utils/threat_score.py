"""Deterministic additive threat scoring for enriched events."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Callable

from app.events.schema import Event


def compute_threat_score(
    event: Event,
    *,
    is_restricted: Callable[[str], bool] | None = None,
    recent_zone_count: int = 0,
) -> int:
    score = 0
    if event.event_type == "zone_intrusion":
        score += 30
    if event.event_type == "loitering" and event.metadata.get("authorization_outcome") == "unauthorized":
        score += 15
    if event.metadata.get("authorization_outcome") == "unresolved":
        score += 10
    if event.event_type == "vehicle_dwell_sensitive_zone":
        score += 20
    if event.severity == "high":
        score += 20
    elif event.severity == "medium":
        score += 10
    if bool(event.metadata.get("is_night")):
        score += 15
    if event.entity_type == "vehicle":
        score += 10
    plate = event.metadata.get("plate") or event.metadata.get("license_plate")
    if plate and is_restricted and is_restricted(str(plate)):
        score += 10
    score += min(max(0, recent_zone_count) * 5, 15)
    return min(score, 100)


def within_previous_ten_minutes(timestamp: datetime | None = None) -> datetime:
    return (timestamp or datetime.now(timezone.utc)) - timedelta(minutes=10)


__all__ = ["compute_threat_score", "within_previous_ten_minutes"]
