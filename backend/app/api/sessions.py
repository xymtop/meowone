from __future__ import annotations
from fastapi import APIRouter
from typing import List
from app.models.session import SessionCreate, SessionUpdate, SessionResponse
from app.services import session_service

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(body: SessionCreate = SessionCreate()):
    return await session_service.create_session("default", body.title)


@router.get("", response_model=List[SessionResponse])
async def list_sessions():
    return await session_service.list_sessions("default")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    return await session_service.get_session(session_id)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, body: SessionUpdate):
    return await session_service.update_session(session_id, body.title)


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    await session_service.delete_session(session_id)
    return {"ok": True}
