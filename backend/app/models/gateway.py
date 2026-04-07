from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List

from app.models.message import Attachment


class GatewayTurnRequest(BaseModel):
    channel_id: str
    external_thread_id: Optional[str] = None
    session_id: Optional[str] = None
    content: str = ""
    attachments: Optional[List[Attachment]] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    scheduler_mode: Optional[str] = None
    task_tag: Optional[str] = None

