import cv2
import numpy as np

from app.utils.image_utils import save_evidence_snapshot


def test_evidence_is_full_frame_with_bbox_overlay(tmp_path, monkeypatch):
    monkeypatch.setattr("app.utils.image_utils.EVIDENCE_DIR", tmp_path)
    monkeypatch.setattr("app.utils.image_utils.REPOSITORY_ROOT", tmp_path.parent)
    frame = np.zeros((40, 60, 3), dtype=np.uint8)

    relative_path = save_evidence_snapshot(frame, (10, 8, 30, 24), "test", "track")

    assert relative_path is not None
    saved = cv2.imread(str(tmp_path / relative_path.split("/")[-1]))
    assert saved.shape[:2] == frame.shape[:2]
    assert np.any(saved[8, 10] != 0)
    assert np.any(saved[24, 30] != 0)


def test_evidence_without_bbox_still_saves_full_frame(tmp_path, monkeypatch):
    monkeypatch.setattr("app.utils.image_utils.EVIDENCE_DIR", tmp_path)
    monkeypatch.setattr("app.utils.image_utils.REPOSITORY_ROOT", tmp_path.parent)
    frame = np.full((20, 25, 3), 80, dtype=np.uint8)

    relative_path = save_evidence_snapshot(frame, None, "night", "track")

    assert relative_path is not None
    saved = cv2.imread(str(tmp_path / relative_path.split("/")[-1]))
    assert saved.shape[:2] == frame.shape[:2]
