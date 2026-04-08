from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, Any, Dict, List


class Attachment(BaseModel):
    """Binary attachment as base64 (image or small text file)."""

    name: str = ""
    mime: str = "application/octet-stream"
    data: str = ""  # base64


class ChatRequest(BaseModel):
    content: str = ""
    type: str = "text"
    attachments: Optional[List[Attachment]] = None
    channel_id: Optional[str] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    scheduler_mode: Optional[str] = None
    task_tag: Optional[str] = None
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None


class CardActionRequest(BaseModel):
    cardId: str
    actionId: str
    payload: Dict[str, Any] = {}
    channel_id: Optional[str] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    scheduler_mode: Optional[str] = None
    task_tag: Optional[str] = None


class A2UIActionRequest(BaseModel):
    """客户端 @a2ui-sdk/react 派发的 ActionPayload（surfaceId / name / context 等）。"""

    action: Dict[str, Any]
    channel_id: Optional[str] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    scheduler_mode: Optional[str] = None
    task_tag: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content_type: str
    content: Optional[str]
    card_data: Optional[Any]
    created_at: str
