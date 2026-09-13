from app.core.detector import ObjectDetector


class FakeModel:
    names = {0: "person"}

    def __init__(self):
        self.calls = []

    def track(self, frame, **kwargs):
        self.calls.append((frame, kwargs))
        return []


def test_detector_persists_tracker_state_across_calls():
    model = FakeModel()
    detector = ObjectDetector.__new__(ObjectDetector)
    detector.model = model
    detector.class_names = model.names

    detector.detect_and_track("frame-1")
    detector.detect_and_track("frame-2")

    assert len(model.calls) == 2
    assert all(call[1]["persist"] is True for call in model.calls)
    assert all(call[1]["tracker"] == "bytetrack.yaml" for call in model.calls)
