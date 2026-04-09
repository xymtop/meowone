"""teams / team_members 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_team_by_id(team_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM teams WHERE id = ?", (team_id,))
        row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("strategy_config_json"), str):
            try:
                d["strategy_config_json"] = json.loads(d["strategy_config_json"])
            except Exception:
                d["strategy_config_json"] = {}
        return d


async def list_team_member_agent_ids(team_id: str) -> List[str]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT agent_id FROM team_members WHERE team_id = ?",
            (team_id,)
        )
        rows = await cur.fetchall()
        return [row[0] for row in rows]
