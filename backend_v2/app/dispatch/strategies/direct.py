"""
Direct 调度策略 —— 直接调用单个智能体

适用场景：单智能体对话、简单问答等。

设计：无需任何用户配置，优先使用 gateway 预填充的 agent_runtime，
      fallback 到从 agent_id / image.agent_ids_json 自动推导。
      若仍无法找到智能体，返回错误。

注册名称: "direct"
"""
from __future__ import annotations

import logging
from typing import AsyncIterator, TYPE_CHECKING

if TYPE_CHECKING:
    from app.dispatch.context import DispatchContext

from app.dispatch.registry import dispatch_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("direct")
async def direct_strategy(ctx: "DispatchContext") -> AsyncIterator[LoopEvent]:
    """
    直接调用策略

    推导顺序（优先级递减）：
    1. ctx.agent_runtime（gateway 已预构建）
    2. ctx.agent_id → 从数据库构建 runtime
    3. ctx.image_id → 取 image.agent_ids_json 的第一个 agent
    """
    from app.agents.builder import agent_builder
    from app.agents.caller import call_agent, AgentCallInput
    from app.db.queries.agent_instances import get_agent_image_by_id

    runtime = ctx.agent_runtime

    # Fallback 1: 从 agent_id 构建
    if runtime is None and ctx.agent_id:
        runtime = await agent_builder.build_by_id(ctx.agent_id)

    # Fallback 2: 从 image.agent_ids_json 取第一个
    if runtime is None and ctx.image_id:
        image = await get_agent_image_by_id(ctx.image_id)
        agent_ids = (image.get("agent_ids_json") or []) if image else []
        if agent_ids:
            runtime = await agent_builder.build_by_id(agent_ids[0])

    if runtime is None:
        msg = (
            f"direct 策略找不到可执行的智能体: "
            f"agent_id={ctx.agent_id}, image_id={ctx.image_id}"
        )
        logger.error(msg)
        yield ErrorEvent(code="AGENT_NOT_FOUND", message=msg)
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    call_input = AgentCallInput(
        user_message=ctx.user_message,
        history=ctx.history,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        model=ctx.model,
    )

    logger.info("direct 策略 → 智能体 %s (type=%s)", runtime.name, runtime.agent_type)
    async for event in call_agent(runtime, call_input):
        yield event
