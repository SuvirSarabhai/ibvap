"""Named demo profiles layered over the normal threshold configuration."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

from app.utils.paths import CONFIG_DIR

DEFAULT_PROFILE = "baseline"
PROFILE_NAMES = (
    "baseline",
    "zone_intrusion",
    "authorized_access",
    "unauthorized_access",
    "loitering",
    "night_mode",
    "anpr",
    "watchlist_vehicle",
    "vehicle_dwell",
)


def load_demo_profiles(path: Path | None = None) -> dict[str, dict[str, Any]]:
    """Load the optional named profile map without making it mandatory."""
    profile_path = path or (CONFIG_DIR / "demo.yaml")
    try:
        with profile_path.open(encoding="utf-8") as config_file:
            profiles = (yaml.safe_load(config_file) or {}).get("profiles", {})
    except (OSError, yaml.YAMLError):
        return {}
    return profiles if isinstance(profiles, dict) else {}


def active_demo_profile() -> str:
    """Return the requested profile, falling back safely to baseline."""
    requested = os.environ.get("DEMO_PROFILE", DEFAULT_PROFILE).strip().lower()
    return requested if requested in PROFILE_NAMES else DEFAULT_PROFILE


def apply_demo_profile(thresholds: dict[str, Any], profile: str | None = None) -> dict[str, Any]:
    """Return thresholds with the selected demo profile layered on top."""
    selected = profile or active_demo_profile()
    values = load_demo_profiles().get(selected, {})
    overrides = values.get("thresholds", {}) if isinstance(values, dict) else {}
    merged = dict(thresholds)
    if isinstance(overrides, dict):
        merged.update(overrides)
    merged["demo_profile"] = selected
    return merged


__all__ = ["DEFAULT_PROFILE", "PROFILE_NAMES", "active_demo_profile", "apply_demo_profile", "load_demo_profiles"]
