"""agents 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agents WHERE id = ?", (agent_id,))
        row = await cur.fetchone()
        return _row(row) if row else None


async def get_agent_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agents WHERE name = ?", (name,))
        row = await cur.fetchone()
        return _row(row) if row else None


async def list_agents(enabled_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute("SELECT * FROM agents WHERE enabled = 1 ORDER BY created_at")
        else:
            cur = await db.execute("SELECT * FROM agents ORDER BY created_at")
        rows = await cur.fetchall()
        return [_row(r) for r in rows]


async def list_agents_by_type(agent_type: str, enabled_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute(
                "SELECT * FROM agents WHERE agent_type = ? AND enabled = 1 ORDER BY created_at",
                (agent_type,)
            )
        else:
            cur = await db.execute(
                "SELECT * FROM agents WHERE agent_type = ? ORDER BY created_at",
                (agent_type,)
            )
        rows = await cur.fetchall()
        return [_row(r) for r in rows]


def _row(row) -> Dict[str, Any]:
    d = dict(row)
    # 反序列化 JSON 列
    for col in ("mcp_servers", "agent_skills", "allow_tools", "deny_tools", "capabilities_json"):
        if isinstance(d.get(col), str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = []
    for col in ("metadata_json",):
        if isinstance(d.get(col), str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = {}
    return d
