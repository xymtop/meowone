"""Load MCP servers from `.meowone/mcp.json` (preferred) or legacy `mcp.yaml`."""
from __future__ import annotations

import json
import shlex
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from app.config import MEOWONE_CONFIG_DIR
from app.services.mcp_service import list_mcp_servers_sync


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def mcp_json_path() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p / "mcp.json"


def mcp_yaml_path() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p / "mcp.yaml"


@dataclass
class McpServerEntry:
    name: str
    command: Optional[str] = None
    cwd: Optional[str] = None
    description: str = ""
    transport: str = "stdio"
    url: Optional[str] = None
    auth_type: str = "none"
    auth_token: Optional[str] = None


def _command_from_parts(command: str, args: Any) -> str:
    """Build one shell-safe command string for `shlex.split` in stdio_session."""
    cmd = str(command or "").strip()
    if isinstance(args, list) and args:
        argv = [cmd] + [str(x) for x in args]
        return shlex.join(argv)
    return cmd


def _entries_from_config(raw: Dict[str, Any]) -> List[McpServerEntry]:
    """
    Supports:
    - **servers**: MeowOne list of { name, command, description?, cwd?, args?, transport?, url? }
    - **mcpServers**: Cursor / IDE style map name -> { command, args?, env?, ... }
    """
    out: List[McpServerEntry] = []
    seen: set[str] = set()

    servers = raw.get("servers")
    if isinstance(servers, list):
        for s in servers:
            if not isinstance(s, dict):
                continue
            name = str(s.get("name") or "").strip()
            cmd = _command_from_parts(str(s.get("command") or ""), s.get("args"))
            if not name or not cmd:
                continue
            cwd = s.get("cwd")
            desc = str(s.get("description") or "")
            transport = str(s.get("transport", "stdio"))
            url = s.get("url")
            seen.add(name)
            out.append(
                McpServerEntry(
                    name=name,
                    command=cmd,
                    cwd=str(cwd).strip() if cwd else None,
                    description=desc,
                    transport=transport,
                    url=str(url).strip() if url else None,
                )
            )

    mcp_servers = raw.get("mcpServers")
    if isinstance(mcp_servers, dict):
        for key, cfg in mcp_servers.items():
            name = str(key).strip()
            if not name or name in seen:
                continue
            if not isinstance(cfg, dict):
                continue
            cmd = _command_from_parts(str(cfg.get("command") or ""), cfg.get("args"))
            if not cmd:
                continue
            cwd = cfg.get("cwd")
            desc = str(cfg.get("description") or "")
            seen.add(name)
            out.append(
                McpServerEntry(
                    name=name,
                    command=cmd,
                    cwd=str(cwd).strip() if cwd else None,
                    description=desc,
                )
            )

    return out


def load_mcp_servers() -> List[McpServerEntry]:
    db_rows = list_mcp_servers_sync(enabled_only=True)
    if db_rows:
        out: List[McpServerEntry] = []
        for row in db_rows:
            out.append(
                McpServerEntry(
                    name=str(row.get("name") or ""),
                    command=str(row.get("command") or "") or None,
                    cwd=str(row.get("cwd") or "").strip() or None,
                    description=str(row.get("description") or ""),
                    transport=str(row.get("transport", "stdio")),
                    url=str(row.get("url") or "").strip() or None,
                    auth_type=str(row.get("auth_type", "none")),
                    auth_token=str(row.get("auth_token") or "").strip() or None,
                )
            )
        return out
    jp = mcp_json_path()
    if jp.is_file():
        try:
            raw = json.loads(jp.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
        if not isinstance(raw, dict):
            return []
        return _entries_from_config(raw)
    yp = mcp_yaml_path()
    if yp.is_file():
        raw = yaml.safe_load(yp.read_text(encoding="utf-8")) or {}
        if not isinstance(raw, dict):
            return []
        return _entries_from_config(raw)
    return []


def get_server_by_name(name: str) -> Optional[McpServerEntry]:
    for s in load_mcp_servers():
        if s.name == name:
            return s
    return None
