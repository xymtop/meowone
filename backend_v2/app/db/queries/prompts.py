"""prompts 表查询"""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.db.connection import get_db


async def get_prompt_by_key(prompt_key: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM prompts WHERE prompt_key = ? AND enabled = 1",
            (prompt_key,)
        )
        row = await cur.fetchone()
        return dict(row) if row else None
