from app.core.incident_tracker import IncidentTracker


def test_frame_threshold_fires_once_and_resets():
    tracker = IncidentTracker()
    assert [tracker.check_persistence("7", "zone", True, frame_threshold=3) for _ in range(2)] == [False, False]
    assert tracker.check_persistence("7", "zone", True, frame_threshold=3) is True
    assert tracker.check_persistence("7", "zone", True, frame_threshold=3) is False
    assert tracker.check_persistence("7", "zone", False, frame_threshold=3) is False
    assert tracker.check_persistence("7", "zone", True, frame_threshold=3) is False


def test_time_threshold_uses_injected_clock():
    now = [100.0]
    tracker = IncidentTracker(clock=lambda: now[0])
    assert tracker.check_persistence("1", "night", True, time_threshold=5) is False
    now[0] = 104.9
    assert tracker.check_persistence("1", "night", True, time_threshold=5) is False
    now[0] = 105.0
    assert tracker.check_persistence("1", "night", True, time_threshold=5) is True
