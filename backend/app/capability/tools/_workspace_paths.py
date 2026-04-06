"""Shared path sandboxing under workspace root."""
from __future__ import annotations

from pathlib import Path

from app.paths import workspace_root


def safe_relative_path(rel: str) -> Path:
    root = workspace_root().resolve()
    cleaned = rel.lstrip("/").replace("..", "")
    p = (root / cleaned).resolve()
    p.relative_to(root)
    return p
