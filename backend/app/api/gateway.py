from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from sse_starlette.sse import EventSourceResponse

from app.core.runtime_container import runtime_container
from app.gateway.adapters.web_sse import stream_web_sse_turn
from app.models.gateway import GatewayTurnRequest
from app.sdk.core import build_user_content, make_display_content, safe_limits
from app.services import log_stream_service
from app.services import message_service
from app.services.channel_session_service import resolve_or_create_session

"""
# 网关 API

作为多渠道接入的统一入口，支持飞书、Web 等渠道的消息处理。

## 主要功能
- **turn**: 接收外部消息，触发 Agent 处理流程
- **logs**: 查询网关日志

## 渠道说明
- `channel_id`: 渠道标识（如 feishu/web/openai 等）
- `external_thread_id`: 外部系统的会话ID，用于跨系统关联

## SSE 事件类型
- `thinking` - 正在思考
- `delta` - 内容增量
- `card` - 卡片数据
- `tool_call` - 工具调用
- `tool_result` - 工具返回
- `error` - 错误
- `done` - 完成
"""
router = APIRouter(prefix="/api/gateway", tags=["网关"])
turn_service = runtime_container.turn_service


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
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
        )
    )


@router.get("/logs")
async def query_gateway_logs(
    session_id: Optional[str] = Query(default=None),
    cursor: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    return log_stream_service.query_logs(session_id=session_id, cursor=cursor, limit=limit)

