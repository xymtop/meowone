from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.gateway.adapters.web_sse import stream_web_sse_turn
from app.gateway.turn_service import ConversationTurnService
from app.models.gateway import GatewayTurnRequest
from app.sdk.core import build_user_content, make_display_content, safe_limits
from app.services import message_service
from app.services.channel_session_service import resolve_or_create_session
from app.capability.registry import registry

router = APIRouter(prefix="/api/gateway", tags=["gateway"])
turn_service = ConversationTurnService(capabilities=registry)


@router.post("/turn")
async def gateway_turn(body: GatewayTurnRequest):
    if not (body.content or "").strip() and not (body.attachments or []):
        raise HTTPException(status_code=400, detail="empty message")

    if body.session_id:
        session_id = body.session_id
    elif body.external_thread_id:
        session_id = await resolve_or_create_session(
            channel_id=body.channel_id,
            external_thread_id=body.external_thread_id,
            user_id="default",
            title=(body.content or "").strip()[:48] or None,
        )
    else:
        raise HTTPException(status_code=400, detail="either session_id or external_thread_id is required")

    user_payload = build_user_content(body.content, body.attachments)
    display = make_display_content(body.content, body.attachments)
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=display or None,
    )
    return EventSourceResponse(
        stream_web_sse_turn(
            turn_service,
            session_id=session_id,
            user_content=user_payload,
            exclude_for_history=display,
            channel_id=body.channel_id,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
        )
    )

