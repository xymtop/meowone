"""sessions / messages 表查询"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from app.db.connection import get_db


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cur.fetchone()
        return dict(row) if row else None


async def list_messages(session_id: str, limit: int = 100) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?",
            (session_id, limit)
        )
        rows = await cur.fetchall()
        result = []
        for row in rows:
            d = dict(row)
            if isinstance(d.get("metadata"), str):
                try:
                    d["metadata"] = json.loads(d["metadata"])
                except Exception:
                    d["metadata"] = {}
            result.append(d)
        return result


async def get_history_as_openai_messages(session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """将历史消息转为 OpenAI 消息格式（user/assistant 角色）"""
    msgs = await list_messages(session_id, limit)
    history = []
    for m in msgs:
        role = m.get("role", "user")
        if role not in ("user", "assistant"):
            continue
        history.append({"role": role, "content": m.get("content", "")})
    return history
