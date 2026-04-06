from __future__ import annotations
import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from app.models.message import ChatRequest, CardActionRequest
from app.services import message_service
from app.loop.runtime import run_loop
from app.loop.events import (
    ThinkingEvent, DeltaEvent, CardEvent, ErrorEvent, DoneEvent,
    ToolCallEvent, ToolResultEvent,
)
from app.capability.registry import registry

router = APIRouter(tags=["chat"])


async def _build_history(session_id: str, exclude_content: str):
    history_rows = await message_service.get_context_messages(session_id, limit=20)
    history = []
    for row in history_rows:
        if row["role"] in ("user", "assistant") and row["content"]:
            history.append({"role": row["role"], "content": row["content"]})
    if history and history[-1]["content"] == exclude_content:
        history = history[:-1]
    return history


async def _stream_loop(session_id: str, user_content: str):
    history = await _build_history(session_id, exclude_content=user_content)

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
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=body.content,
    )
    return EventSourceResponse(_stream_loop(session_id, body.content))


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
    return EventSourceResponse(_stream_loop(session_id, action_content))
