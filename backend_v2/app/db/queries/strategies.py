"""strategies / strategy_configs 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_strategy_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategies WHERE name = ?", (name,))
        row = await cur.fetchone()
        return dict(row) if row else None


async def list_strategies(enabled_only: bool = True) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute("SELECT * FROM strategies WHERE enabled = 1")
        else:
            cur = await db.execute("SELECT * FROM strategies")
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def get_strategy_config_by_id(config_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategy_configs WHERE id = ?", (config_id,))
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("config_json"), str):
            try:
                d["config_json"] = json.loads(d["config_json"])
            except Exception:
                d["config_json"] = {}
        return d


async def get_strategy_config_by_image(image_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM strategy_configs WHERE image_id = ? AND enabled = 1 LIMIT 1",
            (image_id,)
        )
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("config_json"), str):
            try:
                d["config_json"] = json.loads(d["config_json"])
            except Exception:
                d["config_json"] = {}
        return d
