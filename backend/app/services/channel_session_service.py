from __future__ import annotations

import uuid
from typing import Optional

from app.db.database import get_db
from app.services import session_service


async def resolve_or_create_session(
    *,
    channel_id: str,
    external_thread_id: str,
    user_id: str = "default",
    title: Optional[str] = None,
) -> str:
    """Resolve internal session id for a channel thread, creating mapping if absent."""
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT session_id
            FROM channel_sessions
            WHERE channel_id = ? AND external_thread_id = ?
            """,
            (channel_id, external_thread_id),
        )
        row = await cur.fetchone()
        if row and row["session_id"]:
            await db.execute(
                """
                UPDATE channel_sessions
                SET updated_at = datetime('now')
                WHERE channel_id = ? AND external_thread_id = ?
                """,
                (channel_id, external_thread_id),
            )
            await db.commit()
            return str(row["session_id"])

    sess = await session_service.create_session(user_id=user_id, title=title)
    session_id = str(sess["id"])
    mapping_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT OR REPLACE INTO channel_sessions
            (id, channel_id, external_thread_id, session_id, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            """,
            (mapping_id, channel_id, external_thread_id, session_id),
        )
        await db.commit()
    return session_id

