from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel


class OpenAIChatCompletionsRequest(BaseModel):
    model: Optional[str] = None
    messages: List[Dict[str, Any]]
    stream: bool = True
    user: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None


def last_user_content(messages: List[Dict[str, Any]]) -> Union[str, List[Dict[str, Any]]]:
    for m in reversed(messages):
        if m.get("role") == "user":
            return m.get("content") or ""
    return ""

