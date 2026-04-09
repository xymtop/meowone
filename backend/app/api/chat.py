from __future__ import annotations
import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.gateway.adapters.web_sse import stream_web_sse_turn
from app.models.message import A2UIActionRequest, ChatRequest, CardActionRequest
from app.core.runtime_container import runtime_container
from app.services import message_service, session_service, agent_service
from app.sdk.core import build_user_content, make_display_content, safe_limits
from app.services.instance_orchestration_service import load_instance_for_chat

"""
# 对话与交互 API

提供实时对话功能，支持 SSE 流式响应。

## 端点列表
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/sessions/{session_id}/chat | 发送聊天消息 |
| POST | /api/sessions/{session_id}/card-action | 卡片动作回调 |
| POST | /api/sessions/{session_id}/a2ui-action | A2UI动作回调 |

## 对话模式

### 1. 智能体对话
指定 agent_id 或 agent_name，使用单个智能体进行对话。

### 2. 实例对话
指定 instance_id，系统会：
1. 加载实例关联的镜像
2. 根据镜像配置加载智能体组合
3. 根据调度配置（strategy_config）进行多智能体协作
4. 返回协作结果

## SSE 事件类型
- `thinking` - 正在思考
- `delta` - 内容增量（文本片段）
- `card` - 卡片数据（工具结果/交互卡片）
- `tool_call` - 工具调用
- `tool_result` - 工具返回结果
- `error` - 错误信息
- `done` - 完成
"""
router = APIRouter(tags=["对话交互"])
turn_service = runtime_container.turn_service


@router.post(
    "/api/sessions/{session_id}/chat",
    summary="发送聊天消息",
    description="""
## 功能说明
向指定会话发送用户消息，系统会启动 Agent Loop 处理请求并通过 SSE 流式返回结果。

## 对话模式

### 智能体对话
- 指定 agent_id 或 agent_name
- 使用单个智能体进行对话

### 实例对话
- 指定 instance_id
- 系统会加载镜像配置
- 根据调度配置进行多智能体协作
- 返回协作结果

## 请求参数
- `session_id`: 会话ID（路径参数）
- `content`: 消息内容
- `attachments`: 附件列表（可选）
- `instance_id`: 实例ID（用于多智能体对话）
- `agent_name`: 指定智能体名称（可选）
- `agent_id`: 指定智能体ID（优先于name）
- `scheduler_mode`: 调度模式（direct/hierarchical等）
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
    
    # 初始化默认值
    agent_name = body.agent_name
    agent_type = body.agent_type or "internal"
    agent_id = (body.agent_id or "").strip() or None
    instance_id = (body.instance_id or "").strip() or None
    scheduler_mode = body.scheduler_mode
    instance_config = None
    
    # 优先处理实例对话
    if instance_id:
        instance_config = await load_instance_for_chat(instance_id)
        if instance_config:
            # 使用实例配置
            execution_plan = instance_config.get("execution_plan", {})
            agent_ids = instance_config.get("agent_ids", [])
            
            # 更新会话的智能体信息
            if agent_ids:
                # 使用第一个智能体作为主显示
                primary_agent = instance_config.get("agents", [{}])[0]
                agent_name = str(primary_agent.get("name", f"instance:{instance_id}"))
            else:
                agent_name = f"instance:{instance_id}"
            
            # 更新会话信息
            await session_service.update_session(
                session_id=session_id,
                agent_name=agent_name,
                agent_type="instance",
            )
            
            # 如果没有指定调度模式，使用镜像配置的
            if not scheduler_mode and instance_config.get("strategy_info"):
                scheduler_mode = instance_config.get("strategy_info", {}).get("name")
            
            # 如果没有指定模型，使用实例配置的
            if not body.model_name and instance_config.get("model_name"):
                body.model_name = instance_config.get("model_name")
        else:
            raise HTTPException(status_code=404, detail="Instance not found")
    elif agent_id:
        # 智能体对话
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
    elif agent_name:
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
            scheduler_mode=scheduler_mode,
            task_tag=body.task_tag,
            limits=safe_limits(body.max_rounds, body.max_tool_phases, body.timeout_seconds),
            agent_name=agent_name,
            agent_type=agent_type,
            agent_id=agent_id,
            model_name=body.model_name,
            instance_id=instance_id,
            instance_config=instance_config,
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

    agent_name = body.agent_name
    agent_type = body.agent_type or "internal"
    agent_id = (body.agent_id or "").strip() or None

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
    action_content = f"[A2UI Action] {json.dumps(body.action, ensure_ascii=False)}"
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=action_content,
    )
    
    agent_name = body.agent_name
    agent_type = body.agent_type or "internal"
    agent_id = (body.agent_id or "").strip() or None

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