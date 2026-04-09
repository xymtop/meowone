from __future__ import annotations
from fastapi import APIRouter, HTTPException
from typing import List
from app.models.session import SessionCreate, SessionUpdate, SessionResponse
from app.services import session_service

"""
# 会话管理 API

管理对话会话，包括创建、查询、更新和删除会话。

## 主要功能
- 创建新会话
- 查询会话列表
- 获取会话详情
- 更新会话信息
- 删除会话

## 路径说明
所有会话关联的消息可通过 `/api/sessions/{session_id}/messages` 获取
"""
router = APIRouter(prefix="/api/sessions", tags=["会话管理"])


@router.post("", response_model=SessionResponse)
async def create_session(body: SessionCreate = SessionCreate()):
    return await session_service.create_session("default", body.title)


@router.get("", response_model=List[SessionResponse])
async def list_sessions():
    return await session_service.list_sessions("default")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    try:
        return await session_service.get_session(session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, body: SessionUpdate):
    try:
        return await session_service.update_session(session_id, body.title)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    await session_service.delete_session(session_id)
    return {"ok": True}
