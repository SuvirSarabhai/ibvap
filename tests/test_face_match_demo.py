from datetime import datetime, timedelta, timezone

import numpy as np
import pytest

from app.db.models import EventModel
from app.events.schema import Event
from scripts import run_face_match_demo as demo


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def all(self):
        return list(self.rows)


class FakeSession:
    def __init__(self, rows):
        self.rows = rows
        self.closed = False

    def query(self, model):
        assert model is EventModel
        return FakeQuery(self.rows)

    def close(self):
        self.closed = True


class FakeStore:
    def __init__(self):
        self.events = []

    def save_event(self, event: Event):
        self.events.append(event)
        return event


def make_session_factory(rows):
    return lambda: FakeSession(rows)


def test_reference_inputs_are_not_fabricated():
    with pytest.raises(ValueError, match="reference embedding is required"):
        demo.load_reference_embedding(environment={})

    with pytest.raises(ValueError, match="test video path is required"):
        demo.resolve_video_path(value=None)


def test_normalize_reference_embedding_rejects_invalid_values():
    with pytest.raises(ValueError, match="finite"):
        demo.normalize_reference_embedding([np.nan, 0])
    with pytest.raises(ValueError, match="non-zero"):
        demo.normalize_reference_embedding([0, 0])


def test_three_continuous_matches_create_one_event_and_one_evidence():
    store = FakeStore()
    evidence = []

    def save_evidence(frame, bbox, prefix, track_id):
        evidence.append((frame, tuple(bbox), prefix, track_id))
        return "evidence/face-match_demo.jpg"

    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    bridge = demo.FaceMatchDemo(
        [1.0, 0.0],
        reference_identity_value="ref-1",
        reference_name="Demo Person",
        cooldown_seconds=60,
        event_store=store,
        session_factory=make_session_factory([]),
        evidence_saver=save_evidence,
        min_consecutive_frames=1,
    )

    for index in range(3):
        assert bridge.process_match(
            np.zeros((10, 10, 3), dtype=np.uint8),
            (1, 2, 8, 9),
            0.91,
            track_id=f"track-{index}",
            timestamp=start + timedelta(seconds=index),
        ) is (store.events[0] if index == 0 else None)

    assert len(store.events) == 1
    assert len(evidence) == 1
    event = store.events[0]
    assert event.event_type == "face_match"
    assert event.entity_type == "person"
    assert event.evidence_path == "evidence/face-match_demo.jpg"
    assert event.metadata["reference_identity"] == "ref-1"
    assert event.metadata["similarity"] == 0.91
    assert bridge.summary.suppressed_continuous == 2


def test_nonmatch_resets_appearance_and_cooldown_blocks_then_expiry_allows_event():
    store = FakeStore()
    rows = []
    evidence_calls = []
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)

    def save_evidence(*args):
        evidence_calls.append(args)
        return f"evidence/{len(evidence_calls)}.jpg"

    bridge = demo.FaceMatchDemo(
        [1.0, 0.0],
        reference_identity_value="ref-1",
        cooldown_seconds=60,
        event_store=store,
        session_factory=make_session_factory(rows),
        evidence_saver=save_evidence,
    )
    frame = np.zeros((10, 10, 3), dtype=np.uint8)
    bbox = (1, 1, 9, 9)

    first = bridge.process_match(frame, bbox, 0.9, timestamp=start)
    rows.append(
        EventModel(
            event_id=first.event_id,
            track_id=first.track_id,
            camera_id=first.camera_id,
            event_type=first.event_type,
            timestamp=first.timestamp,
            event_metadata=first.metadata,
        )
    )
    bridge.process_match(frame, bbox, 0.1, status="unknown", timestamp=start + timedelta(seconds=1))

    # A new appearance inside the configured cooldown is suppressed.
    assert bridge.process_match(
        frame, bbox, 0.9, timestamp=start + timedelta(seconds=2)
    ) is None
    assert bridge.summary.suppressed_cooldown == 1
    assert len(store.events) == 1

    bridge.process_match(frame, bbox, 0.1, status="unknown", timestamp=start + timedelta(seconds=3))
    # The fake query does not interpret SQL predicates; clearing this row
    # represents the real database query falling outside its cooldown window.
    rows.clear()
    second = bridge.process_match(
        frame, bbox, 0.9, timestamp=start + timedelta(seconds=61)
    )
    assert second is not None
    assert len(store.events) == 2
    assert len(evidence_calls) == 2


def test_failed_evidence_does_not_persist_event():
    store = FakeStore()
    bridge = demo.FaceMatchDemo(
        [1.0, 0.0],
        event_store=store,
        session_factory=make_session_factory([]),
        evidence_saver=lambda *args: None,
    )

    result = bridge.process_match(np.zeros((4, 4, 3), dtype=np.uint8), (0, 0, 3, 3), 0.9)

    assert result is None
    assert store.events == []
    assert bridge.summary.errors


def test_cooldown_matches_reference_identity_not_track_id():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    row = EventModel(
        event_id="event-1",
        track_id="different-track",
        camera_id="face-match-demo",
        event_type="face_match",
        timestamp=now,
        event_metadata={"reference_identity": "ref-1"},
    )
    factory = make_session_factory([row])

    assert demo.has_recent_matching_event(
        session_factory=factory,
        camera_id="face-match-demo",
        identity="ref-1",
        timestamp=now + timedelta(seconds=10),
        cooldown_seconds=60,
    )
    assert not demo.has_recent_matching_event(
        session_factory=factory,
        camera_id="face-match-demo",
        identity="ref-2",
        timestamp=now + timedelta(seconds=10),
        cooldown_seconds=60,
    )
