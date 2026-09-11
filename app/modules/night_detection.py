"""Night-time condition and event-promotion helpers."""

from __future__ import annotations

from datetime import datetime, timezone

from app.events.schema import Event


def is_night(
    current_time: datetime | None = None,
    start_hour: int = 20,
    end_hour: int = 6,
) -> bool:
    """Return whether the hour is in an interval that may cross midnight."""
    hour = (current_time or datetime.now()).hour
    if start_hour == end_hour:
        return True
    if start_hour > end_hour:
        return hour >= start_hour or hour < end_hour
    return start_hour <= hour < end_hour


def check_night_movement(
    inside_zone: bool,
    tracker,
    track_id: str,
    current_time: datetime | None = None,
    duration_seconds: float = 5,
    start_hour: int = 20,
    end_hour: int = 6,
    condition_name: str = "night_movement",
) -> bool:
    condition = is_night(current_time, start_hour, end_hour) and inside_zone
    return tracker.check_persistence(
        track_id,
        condition_name,
        condition,
        time_threshold=duration_seconds,
    )


def process_night_check(
    track_id: str,
    camera_id: str,
    zone_id: str,
    inside_zone: bool,
    tracker,
    duration_seconds: float = 5,
    event_store=None,
    alert_manager=None,
    current_time: datetime | None = None,
    start_hour: int = 20,
    end_hour: int = 6,
    event_description: str | None = None,
    event_type_label: str | None = None,
    entity_type: str | None = None,
    confidence: float | None = None,
    severity: str = "normal",
):
    """Write one night condition event and promote its first threshold crossing."""
    night = is_night(current_time, start_hour, end_hour)
    event = Event(
        track_id=track_id,
        camera_id=camera_id,
        event_type="night_check",
        zone_id=zone_id,
        timestamp=current_time or datetime.now(timezone.utc),
        metadata={"inside_zone": inside_zone, "is_night": night},
        event_description=event_description,
        event_type_label=event_type_label,
        entity_type=entity_type,
        confidence=confidence,
        severity=severity,
    )
    if event_store:
        event = event_store.save_event(event)
    promoted = check_night_movement(
        inside_zone,
        tracker,
        track_id,
        current_time=current_time,
        duration_seconds=duration_seconds,
        start_hour=start_hour,
        end_hour=end_hour,
        condition_name=f"night_movement:{zone_id}",
    )
    alert = None
    if promoted and alert_manager:
        alert = alert_manager.create_alert_from_event(event, "night_movement", "medium")
    return event, alert
