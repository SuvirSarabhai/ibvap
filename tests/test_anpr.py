from app.modules.anpr.voting import PlateVoter, vote_plate


def test_voter_requires_three_valid_reads_and_returns_mode():
    voter = PlateVoter()
    assert voter.add_read("7", "bad") is None
    assert voter.add_read("7", "AB12C3456") is None
    assert voter.add_read("7", "AB12C3456") is None
    assert voter.add_read("7", "AB12C3456") == "AB12C3456"
    assert voter.add_read("7", "AB12C3456") == "AB12C3456"


def test_vote_plate_discards_invalid_reads():
    assert vote_plate(["AB12C3456", "AB12C3456", "XX99Z1234", "AB12C3456"]) == "AB12C3456"
