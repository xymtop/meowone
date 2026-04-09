"""
Direct 调度策略 —— 直接调用单个智能体

适用于：单智能体对话场景。

策略配置 JSON 格式（存在 strategy_configs.config_json 或 agent_instances.strategy_config_json 中）：
    {
        "agent_id":   "智能体 ID（优先）",
        "agent_name": "智能体名称（备用）"
    }

注册名称: "direct"
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from app.dispatch.registry import dispatch_strategy
from app.dispatch.context import DispatchContext
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("direct")
async def direct_strategy(ctx: DispatchContext) -> AsyncIterator[LoopEvent]:
    """
    直接调用策略

    从 strategy_config 中读取 agent_id 或 agent_name，
    构建 AgentRuntime，通过 caller.call_agent 调用。
    """
    from app.agents.builder import agent_builder
    from app.agents.caller import call_agent, AgentCallInput

    config = ctx.strategy_config
    agent_id = str(config.get("agent_id") or "").strip()
    agent_name = str(config.get("agent_name") or "").strip()

    # 构建智能体运行时
    runtime = None
    if agent_id:
        runtime = await agent_builder.build_by_id(agent_id)
    if runtime is None and agent_name:
        runtime = await agent_builder.build_by_name(agent_name)

    if runtime is None:
        msg = f"direct 策略找不到智能体: agent_id={agent_id}, agent_name={agent_name}"
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
