"""Repository-relative paths used by the backend."""

from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPOSITORY_ROOT / "config"
EVIDENCE_DIR = REPOSITORY_ROOT / "evidence"
MODELS_DIR = REPOSITORY_ROOT / "models"
DATABASE_PATH = REPOSITORY_ROOT / "ibvap.db"
