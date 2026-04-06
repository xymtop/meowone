"""Load `.meowone/mcp.yaml` server entries."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, List, Optional

import yaml

from app.config import MEOWONE_CONFIG_DIR


def _repo_root() -> Path:
    # backend/app/mcp/yaml_config.py -> parents[3] = meowone/
    return Path(__file__).resolve().parents[3]


def mcp_config_path() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p / "mcp.yaml"


@dataclass
class McpServerEntry:
    name: str
    command: str
    cwd: Optional[str] = None
    description: str = ""


def load_mcp_servers() -> List[McpServerEntry]:
    path = mcp_config_path()
    if not path.is_file():
        return []
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    servers = raw.get("servers") or []
    out: List[McpServerEntry] = []
    if not isinstance(servers, list):
        return []
    for s in servers:
        if not isinstance(s, dict):
            continue
        name = str(s.get("name") or "").strip()
        cmd = str(s.get("command") or "").strip()
        if not name or not cmd:
            continue
        cwd = s.get("cwd")
        desc = str(s.get("description") or "")
        out.append(
            McpServerEntry(
                name=name,
                command=cmd,
                cwd=str(cwd).strip() if cwd else None,
                description=desc,
            )
        )
    return out


def get_server_by_name(name: str) -> Optional[McpServerEntry]:
    for s in load_mcp_servers():
        if s.name == name:
            return s
    return None
