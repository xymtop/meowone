"""skills 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def list_skills(enabled_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute("SELECT * FROM skills WHERE enabled = 1")
        else:
            cur = await db.execute("SELECT * FROM skills")
        rows = await cur.fetchall()
        return [_row(r) for r in rows]


async def get_skill_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM skills WHERE name = ?", (name,))
        row = await cur.fetchone()
        return _row(row) if row else None


def _row(row) -> Dict[str, Any]:
    d = dict(row)
    for col in ("trigger_keywords", "examples"):
        if isinstance(d.get(col), str):
            try:
                d[col] = json.loads(d[col])
            except Exception:
                d[col] = []
    return d
