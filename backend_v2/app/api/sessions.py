"""
会话管理 API 模块

管理对话会话的 CRUD 操作。

主要功能：
- 创建新会话
- 查询会话列表
- 获取会话详情
- 更新会话信息
- 删除会话

注意：所有会话关联的消息可通过 `/api/sessions/{session_id}/messages` 获取
"""

from __future__ import annotations
from fastapi import APIRouter, HTTPException
from typing import List
from app.models.session import SessionCreate, SessionUpdate, SessionResponse
from app.services import session_service

# 创建路由，路径前缀为 /api/sessions，标签为"会话管理"
router = APIRouter(prefix="/api/sessions", tags=["会话管理"])


@router.post("", response_model=SessionResponse)
async def create_session(body: SessionCreate = SessionCreate()):
    """创建新会话

    Args:
        body: 会话创建请求参数

    Returns:
        创建的会话信息
    """
    return await session_service.create_session("default", body.title)


@router.get("", response_model=List[SessionResponse])
async def list_sessions():
    """查询会话列表

    Returns:
        当前用户的所有会话列表（按更新时间倒序）
    """
    return await session_service.list_sessions("default")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """获取会话详情

    Args:
        session_id: 会话 ID

    Returns:
        会话详细信息

    Raises:
        HTTPException: 404 状态码，会话不存在时
    """
    try:
        return await session_service.get_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, body: SessionUpdate):
    """更新会话信息

    Args:
        session_id: 会话 ID
        body: 要更新的会话信息

    Returns:
        更新后的会话信息

    Raises:
        HTTPException: 404 状态码，会话不存在时
    """
    try:
        return await session_service.update_session(session_id, body.title)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """删除会话

    将会话及其所有关联数据（消息、渠道会话、循环日志）一并删除。

    Args:
        session_id: 会话 ID

    Returns:
        删除成功的确认信息
    """
    await session_service.delete_session(session_id)
    return {"ok": True}
