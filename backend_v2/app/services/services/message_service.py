"""
消息服务模块

提供消息的 CRUD 操作。
"""

from __future__ import annotations
import json
import uuid
from typing import Optional, List, Dict, Any
from app.db.database import get_db
from app.services.services.session_service import set_session_title_if_unset


def _parse_message(row: Dict[str, Any]) -> Dict[str, Any]:
    """解析消息行数据

    将数据库行转换为字典格式，并处理 card_data 字段的 JSON 解析。

    Args:
        row: 数据库行数据

    Returns:
        解析后的消息字典
    """
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
    """列出会话中的消息

    Args:
        session_id: 会话 ID
        limit: 最大返回数量
        offset: 偏移量（用于分页）

    Returns:
        消息列表（按创建时间升序）
    """
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
    """创建新消息

    Args:
        session_id: 会话 ID
        role: 消息角色（user/assistant/tool/system）
        content_type: 内容类型（text/card/cards 等）
        content: 消息文本内容
        card_data: 卡片数据（JSON 字符串）

    Returns:
        创建的消息数据
    """
    message_id = str(uuid.uuid4())
    async with get_db() as db:
        # 插入消息
        await db.execute(
            "INSERT INTO messages (id, session_id, role, content_type, content, card_data) VALUES (?, ?, ?, ?, ?, ?)",
            (message_id, session_id, role, content_type, content, card_data),
        )
        # 更新会话的更新时间
        await db.execute(
            "UPDATE sessions SET updated_at = datetime('now') WHERE id = ?",
            (session_id,),
        )
        await db.commit()
        
        # 如果是用户消息，且会话没有标题，则自动设置标题
        if role == "user":
            await set_session_title_if_unset(session_id, content)
        
        cursor = await db.execute("SELECT * FROM messages WHERE id = ?", (message_id,))
        row = await cursor.fetchone()
        return dict(row)


async def get_context_messages(
    session_id: str, limit: int = 20
) -> List[Dict[str, Any]]:
    """获取用于上下文的消息

    从会话历史中获取最近的消息（倒序获取后反转）。

    Args:
        session_id: 会话 ID
        limit: 最大返回数量

    Returns:
        消息列表（按创建时间升序）
    """
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
            (session_id, limit),
        )
        rows = await cursor.fetchall()
        result = [dict(r) for r in rows]
        # 反转以获得升序
        result.reverse()
        return result
