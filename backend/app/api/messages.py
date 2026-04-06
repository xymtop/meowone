from __future__ import annotations
from fastapi import APIRouter, Query
from typing import List
from app.models.message import MessageResponse
from app.services import message_service

router = APIRouter(prefix="/api/sessions/{session_id}/messages", tags=["messages"])


@router.get("", response_model=List[MessageResponse])
async def list_messages(
    session_id: str, limit: int = Query(50), offset: int = Query(0)
):
    return await message_service.list_messages(session_id, limit, offset)
