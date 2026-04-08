from __future__ import annotations
import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.gateway.adapters.web_sse import stream_web_sse_turn
from app.models.message import A2UIActionRequest, ChatRequest, CardActionRequest
from app.core.runtime_container import runtime_container
from app.services import message_service, session_service
from app.sdk.core import build_user_content, make_display_content, safe_limits

router = APIRouter(tags=["chat"])
turn_service = runtime_container.turn_service


@router.post("/api/sessions/{session_id}/chat")
async def chat(session_id: str, body: ChatRequest):
    if not (body.content or "").strip() and not (body.attachments or []):
        raise HTTPException(status_code=400, detail="empty message")
    display = make_display_content(body.content, body.attachments)
    user_payload = build_user_content(body.content, body.attachments)
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=display or None,
    )
    
    # 如果请求中指定了 agent，更新会话的 agent 信息
    agent_name = body.agent_name
    agent_type = body.agent_type or "internal"
    if agent_name:
        await session_service.update_session(
            session_id=session_id,
            agent_name=agent_name,
            agent_type=agent_type,
        )
    
    return EventSourceResponse(
        stream_web_sse_turn(
            turn_service,
            session_id=session_id,
            user_content=user_payload,
            exclude_for_history=display,
            channel_id=body.channel_id or "web",
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
            agent_name=agent_name,
            agent_type=agent_type,
        )
    )


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
    return EventSourceResponse(
        stream_web_sse_turn(
            turn_service,
            session_id=session_id,
            user_content=action_content,
            exclude_for_history=action_content,
            channel_id=body.channel_id or "web",
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
        )
    )


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
    return EventSourceResponse(
        stream_web_sse_turn(
            turn_service,
            session_id=session_id,
            user_content=action_content,
            exclude_for_history=action_content,
            channel_id=body.channel_id or "web",
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
        )
    )
