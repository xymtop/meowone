from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, Any, Dict


class ChatRequest(BaseModel):
    content: str
    type: str = "text"


class CardActionRequest(BaseModel):
    cardId: str
    actionId: str
    payload: Dict[str, Any] = {}


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content_type: str
    content: Optional[str]
    card_data: Optional[Any]
    created_at: str
