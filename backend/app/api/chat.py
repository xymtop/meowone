from __future__ import annotations
import base64
import json
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.loop.context import UserContent
from app.models.message import A2UIActionRequest, ChatRequest, CardActionRequest
from app.services import message_service
from app.loop.runtime import run_loop
from app.loop.events import (
    ThinkingEvent,
    DeltaEvent,
    CardEvent,
    ErrorEvent,
    DoneEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from app.capability.registry import registry

router = APIRouter(tags=["chat"])


def _display_content_for_db(body: ChatRequest) -> str:
    base = (body.content or "").strip()
    n = len(body.attachments or [])
    if n:
        suffix = f"\n\n[{n} attachment(s)]" if base else f"[{n} attachment(s)]"
        return (base + suffix).strip()
    return base


def build_user_content(body: ChatRequest) -> UserContent:
    """OpenAI-compatible user message: str or multimodal parts."""
    atts = body.attachments or []
    if not atts:
        return body.content or ""
    parts: List[Dict[str, Any]] = []
    if (body.content or "").strip():
        parts.append({"type": "text", "text": body.content})
    for att in atts:
        mime = (att.mime or "application/octet-stream").strip()
        name = att.name or "attachment"
        if mime.startswith("image/") and att.data:
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{att.data}"},
                }
            )
        elif att.data:
            try:
                raw = base64.b64decode(att.data, validate=False)
            except Exception:
                raw = b""
            snippet = raw.decode("utf-8", errors="replace")[:12000]
            parts.append(
                {
                    "type": "text",
                    "text": f"\n\n--- File: {name} ({mime}) ---\n{snippet}",
                }
            )
    if not parts:
        return body.content or ""
    if len(parts) == 1 and parts[0].get("type") == "text":
        return parts[0].get("text") or ""
    return parts


async def _build_history(session_id: str, exclude_content: str):
    history_rows = await message_service.get_context_messages(session_id, limit=20)
    history = []
    for row in history_rows:
        if row["role"] in ("user", "assistant") and row["content"]:
            history.append({"role": row["role"], "content": row["content"]})
    if history and history[-1]["content"] == exclude_content:
        history = history[:-1]
    return history


async def _stream_loop(session_id: str, user_content: UserContent, exclude_for_history: str):
    history = await _build_history(session_id, exclude_content=exclude_for_history)

    accumulated_text = ""
    cards = []

    async for event in run_loop(
        user_message=user_content,
        history=history,
        capabilities=registry,
    ):
        if isinstance(event, ThinkingEvent):
            yield {
                "event": "thinking",
                "data": json.dumps({"step": event.step, "description": event.description}),
            }
        elif isinstance(event, DeltaEvent):
            if event.content:
                accumulated_text += event.content
            yield {
                "event": "delta",
                "data": json.dumps({
                    "messageId": event.message_id,
                    "content": event.content,
                    "done": event.done,
                }),
            }
        elif isinstance(event, CardEvent):
            cards.append(event.card)
            yield {
                "event": "card",
                "data": json.dumps({
                    "messageId": event.message_id,
                    "card": event.card,
                }),
            }
        elif isinstance(event, ToolCallEvent):
            yield {
                "event": "tool_call",
                "data": json.dumps({
                    "toolCallId": event.tool_call_id,
                    "name": event.capability_name,
                }),
            }
        elif isinstance(event, ToolResultEvent):
            yield {
                "event": "tool_result",
                "data": json.dumps({
                    "toolCallId": event.tool_call_id,
                    "name": event.capability_name,
                    "ok": event.success,
                }),
            }
        elif isinstance(event, ErrorEvent):
            yield {
                "event": "error",
                "data": json.dumps({"code": event.code, "message": event.message}),
            }
        elif isinstance(event, DoneEvent):
            if accumulated_text or cards:
                card_data = None
                content_type = "text"
                if cards:
                    content_type = "card" if len(cards) == 1 else "cards"
                    card_data = json.dumps(
                        cards[0] if len(cards) == 1 else cards,
                        ensure_ascii=False,
                    )

                await message_service.create_message(
                    session_id=session_id,
                    role="assistant",
                    content_type=content_type,
                    content=accumulated_text if accumulated_text else None,
                    card_data=card_data,
                )

            yield {
                "event": "done",
                "data": json.dumps({
                    "messageId": event.message_id,
                    "loopRounds": event.loop_rounds,
                    "totalDuration": event.total_duration,
                }),
            }


@router.post("/api/sessions/{session_id}/chat")
async def chat(session_id: str, body: ChatRequest):
    if not (body.content or "").strip() and not (body.attachments or []):
        raise HTTPException(status_code=400, detail="empty message")
    display = _display_content_for_db(body)
    user_payload = build_user_content(body)
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=display or None,
    )
    return EventSourceResponse(_stream_loop(session_id, user_payload, display))


@router.post("/api/sessions/{session_id}/card-action")
async def card_action(session_id: str, body: CardActionRequest):
    action_content = (
        f"[Card Action] Card: {body.cardId}, Action: {body.actionId}, "
        f"Data: {json.dumps(body.payload)}"
    )
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=action_content,
    )
    return EventSourceResponse(_stream_loop(session_id, action_content, action_content))


@router.post("/api/sessions/{session_id}/a2ui-action")
async def a2ui_action(session_id: str, body: A2UIActionRequest):
    """与 card-action 相同：写入一条用户消息并跑 Agent Loop（SSE）。"""
    action_content = f"[A2UI Action] {json.dumps(body.action, ensure_ascii=False)}"
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=action_content,
    )
    return EventSourceResponse(_stream_loop(session_id, action_content, action_content))
