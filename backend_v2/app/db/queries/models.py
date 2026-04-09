"""llm_models 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_default_model() -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM llm_models WHERE is_default = 1 AND enabled = 1 LIMIT 1"
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_model_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM llm_models WHERE name = ? AND enabled = 1", (name,))
        row = await cur.fetchone()
        return dict(row) if row else None


async def list_models(enabled_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute("SELECT * FROM llm_models WHERE enabled = 1")
        else:
            cur = await db.execute("SELECT * FROM llm_models")
        rows = await cur.fetchall()
        return [dict(r) for r in rows]
