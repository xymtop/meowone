from __future__ import annotations
import json
import uuid
from typing import Optional, List, Dict, Any
from app.db.database import get_db
from app.services.session_service import set_session_title_if_unset


def _parse_message(row: Dict[str, Any]) -> Dict[str, Any]:
    msg = dict(row)
    if msg.get("card_data") and isinstance(msg["card_data"], str):
        try:
            msg["card_data"] = json.loads(msg["card_data"])
        except json.JSONDecodeError:
            pass
    return msg


async def list_messages(
    session_id: str, limit: int = 50, offset: int = 0
) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?",
            (session_id, limit, offset),
        )
        rows = await cursor.fetchall()
        return [_parse_message(r) for r in rows]


async def create_message(
    session_id: str,
    role: str,
    content_type: str,
    content: Optional[str] = None,
    card_data: Optional[str] = None,
) -> Dict[str, Any]:
    message_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO messages (id, session_id, role, content_type, content, card_data) VALUES (?, ?, ?, ?, ?, ?)",
            (message_id, session_id, role, content_type, content, card_data),
        )
        await db.execute(
            "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
            (session_id,),
        )
        await db.commit()
        if role == "user":
            await set_session_title_if_unset(session_id, content)
        cursor = await db.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
        row = await cursor.fetchone()
        return dict(row)


async def get_context_messages(
    session_id: str, limit: int = 20
) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
            (session_id, limit),
        )
        rows = await cursor.fetchall()
        result = [dict(r) for r in rows]
        result.reverse()
        return result
