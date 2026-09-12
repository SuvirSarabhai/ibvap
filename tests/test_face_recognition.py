import numpy as np

from app.db.models import FaceEmbeddingModel, PersonnelModel
from app.modules import face_recognition
from app.modules.authorization import check_authorization


class FakeFace:
    def __init__(self, bbox, embedding, score=0.99):
        self.bbox = np.asarray(bbox, dtype=np.float32)
        self.normed_embedding = np.asarray(embedding, dtype=np.float32)
        self.det_score = score


class FakeAnalyzer:
    def __init__(self, faces):
        self.faces = faces

    def get(self, image):
        return self.faces


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def join(self, *args, **kwargs):
        return self

    def filter(self, *args, **kwargs):
        return self

    def all(self):
        return self.rows


class FakeSession:
    def __init__(self, rows):
        self.rows = rows

    def query(self, *args, **kwargs):
        return FakeQuery(self.rows)

    def get(self, model, person_id):
        return next((person for person in self.rows if person.person_id == person_id), None)

    def close(self):
        pass


def settings(**overrides):
    result = dict(face_recognition.DEFAULTS)
    result.update(overrides)
    return result


def noisy_frame():
    rng = np.random.default_rng(7)
    return rng.integers(0, 255, (120, 120, 3), dtype=np.uint8)


def test_match_face_returns_matched_for_clear_enrolled_embedding(monkeypatch):
    person = PersonnelModel(person_id="p1", display_name="Consented Demo", active=True, allowed_zones=["alpha"])
    stored = FaceEmbeddingModel(embedding_id="e1", person_id="p1", embedding=[1.0, 0.0], active=True)
    monkeypatch.setattr(face_recognition, "_settings", lambda: settings())
    monkeypatch.setattr(face_recognition, "_load_model", lambda settings: FakeAnalyzer([FakeFace((10, 10, 70, 70), [1, 0])]))
    monkeypatch.setattr(face_recognition, "SessionLocal", lambda: FakeSession([(stored, person)]))

    result = face_recognition.match_face("track", noisy_frame(), (0, 0, 100, 100))

    assert result["status"] == "matched"
    assert result["person_id"] == "p1"
    assert result["similarity"] > 0.55


def test_match_face_rejects_small_face_as_low_quality(monkeypatch):
    monkeypatch.setattr(face_recognition, "_settings", lambda: settings())
    monkeypatch.setattr(face_recognition, "_load_model", lambda settings: FakeAnalyzer([FakeFace((0, 0, 20, 20), [1, 0])]))

    result = face_recognition.match_face("track", noisy_frame(), (0, 0, 20, 20))

    assert result["status"] == "low_quality"
    assert result["person_id"] is None


def test_match_face_returns_unknown_for_different_face(monkeypatch):
    person = PersonnelModel(person_id="p1", display_name="Consented Demo", active=True, allowed_zones=[])
    stored = FaceEmbeddingModel(embedding_id="e1", person_id="p1", embedding=[1.0, 0.0], active=True)
    monkeypatch.setattr(face_recognition, "_settings", lambda: settings())
    monkeypatch.setattr(face_recognition, "_load_model", lambda settings: FakeAnalyzer([FakeFace((10, 10, 70, 70), [0, 1])]))
    monkeypatch.setattr(face_recognition, "SessionLocal", lambda: FakeSession([(stored, person)]))

    result = face_recognition.match_face("track", noisy_frame(), (0, 0, 100, 100))

    assert result["status"] == "unknown"
    assert result["person_id"] is None


def test_match_face_returns_unavailable_without_face_or_when_disabled(monkeypatch):
    monkeypatch.setattr(face_recognition, "_settings", lambda: settings())
    monkeypatch.setattr(face_recognition, "_load_model", lambda settings: FakeAnalyzer([]))
    assert face_recognition.match_face("track", noisy_frame(), (0, 0, 100, 100))["status"] == "unavailable"

    monkeypatch.setattr(face_recognition, "_settings", lambda: settings(enabled=False))
    assert face_recognition.match_face("track", noisy_frame(), (0, 0, 100, 100))["status"] == "unavailable"


def test_authorization_distinguishes_matched_zone_and_unresolved():
    person = PersonnelModel(person_id="p1", display_name="Demo", active=True, allowed_zones=["alpha"])
    factory = lambda: FakeSession([person])

    assert check_authorization("track", "alpha", {"status": "matched", "person_id": "p1"}, session_factory=factory)["outcome"] == "authorized"
    assert check_authorization("track", "beta", {"status": "matched", "person_id": "p1"}, session_factory=factory)["outcome"] == "unauthorized"
    assert check_authorization("track", "alpha", {"status": "unknown", "person_id": None}, session_factory=factory)["outcome"] == "unresolved"
    assert check_authorization("track", "alpha", {"status": "low_quality", "person_id": None}, session_factory=factory)["outcome"] == "unresolved"
