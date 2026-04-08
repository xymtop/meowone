from __future__ import annotations
import uuid
from typing import Optional, List, Dict, Any
from app.db.database import get_db


async def create_session(user_id: str, title: Optional[str] = None, agent_name: Optional[str] = None, agent_type: Optional[str] = None) -> Dict[str, Any]:
    session_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            "INSERT INTO sessions (id, user_id, title, agent_name, agent_type) VALUES (?, ?, ?, ?, ?)",
            (session_id, user_id, title, agent_name, agent_type),
        )
        await db.commit()
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        return dict(row)


async def list_sessions(user_id: str) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def get_session(session_id: str) -> Dict[str, Any]:
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"Session {session_id} not found")
        return dict(row)


async def update_session(session_id: str, title: Optional[str] = None, agent_name: Optional[str] = None, agent_type: Optional[str] = None) -> Dict[str, Any]:
    async with get_db() as db:
        updates = []
        params = []
        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if agent_name is not None:
            updates.append("agent_name = ?")
            params.append(agent_name)
        if agent_type is not None:
            updates.append("agent_type = ?")
            params.append(agent_type)
        if updates:
            updates.append("updated_at = datetime('now')")
            params.append(session_id)
            await db.execute(
                f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?",
                tuple(params),
            )
        await db.commit()
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"Session {session_id} not found")
        return dict(row)


async def delete_session(session_id: str) -> None:
    async with get_db() as db:
        await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM channel_sessions WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM loop_logs WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()


def _title_from_user_text(content: str, max_len: int = 48) -> str:
    """从首条用户消息截取会话标题（单行、去空白）。"""
    if not content or not content.strip():
        return ""
    line = content.strip().split("\n", 1)[0].strip()
    if len(line) > max_len:
        return line[: max_len - 1] + "…"
    return line


async def set_session_title_if_unset(session_id: str, user_content: Optional[str]) -> None:
    """若会话尚无标题，用用户首条消息内容作为标题。"""
    title = _title_from_user_text(user_content or "")
    if not title:
        return
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT COALESCE(TRIM(title), '') AS t FROM sessions WHERE id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()
        if not row or row[0]:
            return
        await db.execute(
            "UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
            (title, session_id),
        )
        await db.commit()
