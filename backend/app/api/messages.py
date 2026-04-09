from __future__ import annotations
from fastapi import APIRouter, Query
from typing import List
from app.models.message import MessageResponse
from app.services import message_service

"""
# 消息管理 API

查询会话中的历史消息记录。

## 功能说明
支持分页查询会话消息，按创建时间排序。
"""
router = APIRouter(prefix="/api/sessions/{session_id}/messages", tags=["会话管理"])


@router.get("", response_model=List[MessageResponse])
async def list_messages(
    session_id: str, limit: int = Query(50), offset: int = Query(0)
):
    return await message_service.list_messages(session_id, limit, offset)
