from __future__ import annotations

import json
import shlex
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import DATABASE_PATH, MEOWONE_CONFIG_DIR
from app.db.database import get_db


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _config_root() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p


def _mcp_json_path() -> Path:
    return _config_root() / "mcp.json"


def _command_from_parts(command: str, args: Any) -> str:
    cmd = str(command or "").strip()
    if isinstance(args, list) and args:
        argv = [cmd] + [str(x) for x in args]
        return shlex.join(argv)
    return cmd


def _sync_from_file_if_empty_sync() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        count = conn.execute("SELECT COUNT(*) FROM mcp_servers").fetchone()[0]
        if count > 0:
            return
        path = _mcp_json_path()
        if not path.is_file():
            return
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        if not isinstance(raw, dict):
            return
        servers = raw.get("servers")
        if not isinstance(servers, list):
            servers = []
        for item in servers:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            command = _command_from_parts(str(item.get("command") or ""), item.get("args"))
            if not name or not command:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO mcp_servers (id, name, command, cwd, description, enabled, source)
                VALUES (?, ?, ?, ?, ?, 1, 'file-import')
                """,
                (
                    str(uuid.uuid4()),
                    name,
                    command,
                    str(item.get("cwd") or "").strip() or None,
                    str(item.get("description") or "").strip(),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def list_mcp_servers_sync(enabled_only: bool = True) -> List[Dict[str, Any]]:
    _sync_from_file_if_empty_sync()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        if enabled_only:
            rows = conn.execute(
                "SELECT name, command, cwd, description FROM mcp_servers WHERE enabled = 1 ORDER BY name ASC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT name, command, cwd, description, enabled FROM mcp_servers ORDER BY name ASC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


async def list_mcp_servers(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute(
                "SELECT name, command, cwd, description, enabled FROM mcp_servers WHERE enabled = 1 ORDER BY name ASC"
            )
        else:
            cur = await db.execute(
                "SELECT name, command, cwd, description, enabled FROM mcp_servers ORDER BY name ASC"
            )
        rows = await cur.fetchall()
        if rows:
            return [dict(r) for r in rows]
    _sync_from_file_if_empty_sync()
    async with get_db() as db:
        cur = await db.execute(
            "SELECT name, command, cwd, description, enabled FROM mcp_servers ORDER BY name ASC"
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def upsert_mcp_server(*, name: str, command: str, description: str = "", cwd: Optional[str] = None) -> None:
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO mcp_servers (id, name, command, cwd, description, enabled, source, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, 'db', datetime('now'))
            ON CONFLICT(name) DO UPDATE SET
              command=excluded.command,
              cwd=excluded.cwd,
              description=excluded.description,
              enabled=1,
              source='db',
              updated_at=datetime('now')
            """,
            (str(uuid.uuid4()), name, command, cwd, description),
        )
        await db.commit()


async def delete_mcp_server(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM mcp_servers WHERE name = ?", (name,))
        await db.commit()
        return (cur.rowcount or 0) > 0
