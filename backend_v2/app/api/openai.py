from __future__ import annotations

from typing import Any, Dict, List, Optional

import json
import time
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.config import LLM_MODEL
from app.core.runtime_container import runtime_container
from app.models.openai import OpenAIChatCompletionsRequest, last_user_content
from app.sdk.core import (
    make_display_content,
    safe_limits,
    stream_openai_chunks_from_sse,
    stream_turn_sse,
)
from app.services import message_service
from app.services.services.channel_session_service import resolve_or_create_session

"""
# OpenAI 兼容 API

提供与 OpenAI Chat Completions API 兼容的接口，支持流式和非流式响应。

## 兼容性说明
- 兼容 OpenAI Chat Completions 格式
- 支持 `stream=true` 返回 SSE 流式 chunk
- 支持扩展参数：`scheduler_mode`, `task_tag`, `max_rounds`, `max_tool_phases`, `timeout_seconds`

## 请求示例
```json
{
  "model": "gpt-4",
  "messages": [{"role": "user", "content": "你好"}],
  "stream": true
}
```

## 响应格式（非流式）
```json
{
  "id": "chatcmpl-meowone",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop"
  }]
}
```
"""
router = APIRouter(prefix="/v1", tags=["OpenAI兼容"])
turn_service = runtime_container.turn_service


@router.post("/chat/completions")
async def chat_completions(body: OpenAIChatCompletionsRequest):
    user_content = last_user_content(body.messages)
    if not user_content:
        raise HTTPException(status_code=400, detail="No user message in request.messages")

    channel_id = "openai"
    external_thread = None
    if body.metadata and isinstance(body.metadata, dict):
        external_thread = body.metadata.get("conversation_id") or body.metadata.get("thread_id")
    external_thread = str(external_thread or body.user or "openai-default")

    session_id = await resolve_or_create_session(
        channel_id=channel_id,
        external_thread_id=external_thread,
        user_id="default",
    )

    # Persist only text summary for the user row (same strategy as existing API).
    if isinstance(user_content, str):
        display = user_content.strip()
    elif isinstance(user_content, list):
        texts: List[str] = []
        for p in user_content:
            if isinstance(p, dict) and p.get("type") == "text":
                texts.append(str(p.get("text", "")))
        display = "\n".join([x for x in texts if x]).strip()
    else:
        display = str(user_content).strip()
    display = make_display_content(display, attachments=None)
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=display or None,
    )

    turn_events = stream_turn_sse(
        turn_service=turn_service,
        session_id=session_id,
        user_content=user_content,
        exclude_for_history=display,
        channel_id=channel_id,
        scheduler_mode=body.scheduler_mode,
        task_tag=body.task_tag,
        limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
    )
    model_name = body.model or LLM_MODEL

    if body.stream:
        chunks = stream_openai_chunks_from_sse(
            model=model_name,
            turn_events=turn_events,
        )
        return EventSourceResponse(chunks, media_type="text/event-stream")

    text_parts: List[str] = []
    async for ev in turn_events:
        if ev.get("event") != "delta":
            continue
        raw = ev.get("data", "")
        try:
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {}
        piece = str(data.get("content") or "")
        if piece:
            text_parts.append(piece)
    output = "".join(text_parts)
    created = int(time.time())
    return {
        "id": "chatcmpl-meowone",
        "object": "chat.completion",
        "created": created,
        "model": model_name,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": output},
                "finish_reason": "stop",
            }
        ],
    }

