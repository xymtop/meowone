"""
会话服务模块

提供会话的 CRUD（创建、读取、更新、删除）操作。
"""

from __future__ import annotations
import uuid
from typing import Optional, List, Dict, Any
from app.db.database import get_db


async def create_session(user_id: str, title: Optional[str] = None, agent_name: Optional[str] = None, agent_type: Optional[str] = None) -> Dict[str, Any]:
    """创建新会话

    Args:
        user_id: 用户 ID
        title: 会话标题（可选）
        agent_name: 关联的智能体名称（可选）
        agent_type: 智能体类型（可选）

    Returns:
        创建的会话数据
    """
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
    """列出用户的所有会话

    Args:
        user_id: 用户 ID

    Returns:
        会话列表（按更新时间倒序）
    """
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def get_session(session_id: str) -> Dict[str, Any]:
    """获取会话详情

    Args:
        session_id: 会话 ID

    Returns:
        会话数据

    Raises:
        ValueError: 会话不存在
    """
    async with get_db() as db:
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"Session {session_id} not found")
        return dict(row)


async def update_session(session_id: str, title: Optional[str] = None, agent_name: Optional[str] = None, agent_type: Optional[str] = None) -> Dict[str, Any]:
    """更新会话信息

    Args:
        session_id: 会话 ID
        title: 新的标题（可选，不传则不更新）
        agent_name: 新的智能体名称（可选）
        agent_type: 新的智能体类型（可选）

    Returns:
        更新后的会话数据

    Raises:
        ValueError: 会话不存在
    """
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
    """删除会话及其关联数据

    会同时删除会话中的消息、渠道会话和循环日志。

    Args:
        session_id: 会话 ID
    """
    async with get_db() as db:
        await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM channel_sessions WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM loop_logs WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()


def _title_from_user_text(content: str, max_len: int = 48) -> str:
    """从用户消息提取会话标题

    使用第一条用户消息的第一行作为标题。

    Args:
        content: 用户消息内容
        max_len: 最大标题长度

    Returns:
        提取的标题（已截断）
    """
    if not content or not content.strip():
        return ""
    # 取第一行
    line = content.strip().split("\n", 1)[0].strip()
    if len(line) > max_len:
        return line[: max_len - 1] + "…"
    return line


async def set_session_title_if_unset(session_id: str, user_content: Optional[str]) -> None:
    """如果会话没有标题，则设置标题

    使用用户的第一条消息内容作为标题。

    Args:
        session_id: 会话 ID
        user_content: 用户消息内容
    """
    title = _title_from_user_text(user_content or "")
    if not title:
        return
    async with get_db() as db:
        # 检查当前标题是否为空
        cursor = await db.execute(
            "SELECT COALESCE(TRIM(title), '') AS t FROM sessions WHERE id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()
        if not row or row[0]:
            return
        # 设置标题
        await db.execute(
            "UPDATE sessions SET title = ?, updated_at = datetime('now') WHERE id = ?",
            (title, session_id),
        )
        await db.commit()
