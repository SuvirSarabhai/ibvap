import logging

import numpy as np

from app.modules.anpr import ocr
from app.modules.anpr.voting import PlateVoter, vote_plate


def test_generic_mode_accepts_non_indian_plate_like_read():
    voter = PlateVoter()
    assert voter.add_read("car-1", "AI 0720-4") is None
    assert voter.add_read("car-1", "AI0720-4") is None
    assert voter.add_read("car-1", "AI07204") == "AI07204"


def test_indian_mode_keeps_strict_validation():
    voter = PlateVoter(plate_format="indian")
    assert voter.add_read("car-1", "AI0720-4") is None
    assert voter.add_read("car-1", "AB12C3456") is None
    assert voter.add_read("car-1", "AB12C3456") is None
    assert voter.add_read("car-1", "AB12C3456") == "AB12C3456"


def test_generic_mode_rejects_non_plate_like_reads():
    voter = PlateVoter()
    assert voter.add_read("car-1", "123456") is None
    assert voter.add_read("car-1", "ABCDEFG") is None
    assert voter.add_read("car-1", "A1") is None
    assert voter.add_read("car-1", "ABCDEFGHIJ1") is None


def test_invalid_format_falls_back_to_generic():
    voter = PlateVoter(plate_format="unknown")
    assert voter.add_read("car-1", "AI07204") is None
    assert voter.add_read("car-1", "AI07204") is None
    assert voter.add_read("car-1", "AI07204") == "AI07204"


def test_voter_requires_three_valid_reads_and_returns_mode():
    voter = PlateVoter()
    assert voter.add_read("7", "bad") is None
    assert voter.add_read("7", "AB12C3456") is None
    assert voter.add_read("7", "AB12C3456") is None
    assert voter.add_read("7", "AB12C3456") == "AB12C3456"
    assert voter.add_read("7", "AB12C3456") == "AB12C3456"


def test_vote_plate_discards_invalid_reads():
    assert vote_plate(["AB12C3456", "AB12C3456", "XX99Z1234", "AB12C3456"]) == "AB12C3456"


def test_two_part_plate_fragments_combine_per_track():
    voter = PlateVoter()
    assert voter.add_read("car-1", "A", now=10.0) is None
    assert voter.add_read("car-1", "0720-4", now=10.5) is None
    assert voter.add_read("car-1", "A / 0720-4", now=10.6) is None
    assert voter.add_read("car-1", "A | 0720-4", now=10.7) == "A07204"
    assert voter.add_read("car-1", "A", now=11.0) is None
    assert voter.add_read("car-1", "0720-4", now=11.1) == "A07204"
    assert voter.add_read("car-1", "A", now=11.2) is None
    assert voter.add_read("car-1", "0720-4", now=11.3) == "A07204"


def test_fragments_do_not_cross_tracks_or_expire():
    voter = PlateVoter(fragment_window_seconds=1.0)
    assert voter.add_read("car-1", "A", now=10.0) is None
    assert voter.add_read("car-2", "0720-4", now=10.1) is None
    assert voter.add_read("car-1", "0720-4", now=11.1) is None
    assert voter.add_read("car-1", "A", now=20.0) is None
    assert voter.add_read("car-1", "0720-4", now=20.5) is None


def test_ocr_logs_raw_reads_before_filtering(monkeypatch, caplog):
    class FakeReader:
        def readtext(self, image, detail=1):
            return [([], "AI 0720-4", 0.91), ([], "x", 0.95)]

    monkeypatch.setattr(ocr, "_reader", FakeReader())
    caplog.set_level(logging.INFO, logger=ocr.logger.name)
    reads = ocr.read_plate(np.zeros((20, 40), dtype=np.uint8), camera_id="camera-car", track_id="7")

    assert reads == ["AI07204", "X"]
    messages = [record.getMessage() for record in caplog.records]
    assert any("raw read" in message and "AI 0720-4" in message for message in messages)
    assert any("raw read" in message and "x" in message for message in messages)
