"""
对话与交互 API 模块

提供实时对话功能，支持 SSE 流式响应。

## 端点列表
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/sessions/{session_id}/chat | 发送聊天消息 |
| POST | /api/sessions/{session_id}/card-action | 卡片动作回调 |
| POST | /api/sessions/{session_id}/a2ui-action | A2UI动作回调 |

## SSE 事件类型
- `thinking` - 正在思考
- `delta` - 内容增量（文本片段）
- `card` - 卡片数据（工具结果/交互卡片）
- `tool_call` - 工具调用
- `tool_result` - 工具返回结果
- `error` - 错误信息
- `done` - 完成
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.gateway.gateway.adapters.web_sse import stream_web_sse_turn
from app.core.runtime_container import runtime_container
from app.models.message import A2UIActionRequest, ChatRequest, CardActionRequest
from app.services import message_service, session_service, agent_service
from app.sdk.core import build_user_content, make_display_content, safe_limits


router = APIRouter(tags=["对话交互"])
turn_service = runtime_container.turn_service


@router.post(
    "/api/sessions/{session_id}/chat",
    summary="发送聊天消息",
    description="""
## 功能说明
向指定会话发送用户消息，系统会启动 Agent Loop 处理请求并通过 SSE 流式返回结果。

## 请求参数
- `session_id`: 会话ID（路径参数）
- `content`: 消息内容
- `attachments`: 附件列表（可选，用于图片等多模态输入）
- `agent_name`: 指定智能体名称（可选）
- `agent_id`: 指定智能体ID（优先于name）
- `scheduler_mode`: 调度模式（direct/hierarchical/democratic等）
- `max_rounds`: 最大轮次限制
- `max_tool_phases`: 最大工具调用阶段数
- `timeout_seconds`: 超时时间（秒）

## SSE 事件流
返回流式事件，包含 thinking/delta/card/tool_call/tool_result/error/done
    """,
)
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

    agent_name = body.agent_name
    agent_id = (body.agent_id or "").strip() or None
    agent_type = "internal"
    if agent_id:
        row = await agent_service.get_agent_by_id(agent_id)
        if row:
            agent_name = str(row.get("name") or "")
            agent_type = str(row.get("agent_type") or "internal")

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
            agent_id=agent_id,
            model_name=body.model_name,
        )
    )


@router.post("/api/sessions/{session_id}/card-action")
async def card_action(session_id: str, body: CardActionRequest):
    action_content = (
        f"[Card Action] Card: {body.cardId}, Action: {body.actionId}, "
        f"Data: {body.payload}"
    )
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=action_content,
    )

    agent_name = body.agent_name
    agent_id = (body.agent_id or "").strip() or None
    agent_type = "internal"
    if agent_id:
        row = await agent_service.get_agent_by_id(agent_id)
        if row:
            agent_name = str(row.get("name") or "")
            agent_type = str(row.get("agent_type") or "internal")

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
            user_content=action_content,
            exclude_for_history=action_content,
            channel_id=body.channel_id or "web",
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
            agent_name=agent_name,
            agent_type=agent_type,
            agent_id=agent_id,
            model_name=body.model_name,
        )
    )


@router.post("/api/sessions/{session_id}/a2ui-action")
async def a2ui_action(session_id: str, body: A2UIActionRequest):
    """与 card-action 相同：写入一条用户消息并跑 Agent Loop（SSE）。"""
    action_content = f"[A2UI Action] {body.action}"
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=action_content,
    )

    agent_name = body.agent_name
    agent_id = (body.agent_id or "").strip() or None
    agent_type = "internal"
    if agent_id:
        row = await agent_service.get_agent_by_id(agent_id)
        if row:
            agent_name = str(row.get("name") or "")
            agent_type = str(row.get("agent_type") or "internal")

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
            user_content=action_content,
            exclude_for_history=action_content,
            channel_id=body.channel_id or "web",
            scheduler_mode=body.scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
            agent_name=agent_name,
            agent_type=agent_type,
            agent_id=agent_id,
            model_name=body.model_name,
        )
    )