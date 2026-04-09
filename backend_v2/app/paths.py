"""Resolved paths relative to the repository root (meowone/)."""
from __future__ import annotations

from pathlib import Path

from app.config import WORKSPACE_ROOT


def repo_root() -> Path:
    # backend/app/paths.py -> parents[2] = repository root (meowone/)
    return Path(__file__).resolve().parents[2]


def workspace_root() -> Path:
    if WORKSPACE_ROOT.strip():
        return Path(WORKSPACE_ROOT).expanduser().resolve()
    return repo_root()
