from app.core.incident_tracker import IncidentTracker
from app.core.detector import Detection
from app.modules.zone_intrusion import check_zone, process_detection


def test_check_zone_uses_bbox_center():
    polygon = [[0, 0], [10, 0], [10, 10], [0, 10]]
    assert check_zone("1", (2, 2, 4, 4), polygon)
    assert not check_zone("1", (20, 20, 30, 30), polygon)


def test_zone_promotion_happens_once_per_entry():
    class Store:
        def save_event(self, event):
            return event

    class Alerts:
        def __init__(self):
            self.calls = []

        def create_alert_from_event(self, *args):
            self.calls.append(args)
            return args

    alerts = Alerts()
    tracker = IncidentTracker()
    detection = Detection("1", "person", (2, 2, 4, 4), 0.9)
    for _ in range(3):
        process_detection(detection, "cam", "zone", [[0, 0], [10, 0], [10, 10], [0, 10]], tracker, 3, Store(), alerts)
    process_detection(detection, "cam", "zone", [[0, 0], [10, 0], [10, 10], [0, 10]], tracker, 3, Store(), alerts)
    assert len(alerts.calls) == 1
