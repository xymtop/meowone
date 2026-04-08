from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class SessionCreate(BaseModel):
    title: Optional[str] = None
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    summary: Optional[str]
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None
    created_at: str
    updated_at: str
