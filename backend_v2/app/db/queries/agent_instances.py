"""agent_images / agent_instances 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_agent_image_by_id(image_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_images WHERE id = ?", (image_id,))
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        for col in ("agent_ids_json", "metadata_json"):
            if isinstance(d.get(col), str):
                try:
                    d[col] = json.loads(d[col])
                except Exception:
                    d[col] = [] if "ids" in col else {}
        return d


async def get_agent_instance_by_id(instance_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE id = ?", (instance_id,))
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        for col in ("strategy_config_json", "runtime_config_json", "metadata_json"):
            if isinstance(d.get(col), str):
                try:
                    d[col] = json.loads(d[col])
                except Exception:
                    d[col] = {}
        return d


async def get_agent_instance_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE name = ? AND enabled = 1", (name,))
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        for col in ("strategy_config_json", "runtime_config_json", "metadata_json"):
            if isinstance(d.get(col), str):
                try:
                    d[col] = json.loads(d[col])
                except Exception:
                    d[col] = {}
        return d
