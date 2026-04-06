"""Read-only view of `.meowone/` config files for the settings UI."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

from app.config import MEOWONE_CONFIG_DIR

router = APIRouter(prefix="/api/meowone", tags=["meowone-config"])

MAX_FILE_BYTES = 256_000


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _config_root() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p


@router.get("/config")
async def list_meowone_config():
    root = _config_root()
    if not root.is_dir():
        return {"root": str(root), "files": []}
    files_out: list[dict[str, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if path.suffix.lower() not in {".md", ".json", ".yaml", ".yml", ".txt"}:
            continue
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if len(raw) > MAX_FILE_BYTES:
            text = raw[:MAX_FILE_BYTES].decode("utf-8", errors="replace") + "\n\n… [truncated]"
        else:
            text = raw.decode("utf-8", errors="replace")
        files_out.append({"path": str(rel).replace("\\", "/"), "content": text})
    return {"root": str(root), "files": files_out}
