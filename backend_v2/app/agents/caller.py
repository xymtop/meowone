"""
统一智能体调用接口

call_agent(runtime, input) -> AsyncIterator[LoopEvent]

内部智能体 → 构建 LoopContext → loop/engine.py
外部智能体 → a2a_client.call_a2a_agent()

所有调用方（dispatch 策略、chat API、工具）统一使用此接口，
不需要关心智能体是内部还是外部。
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional

from app.agents.runtime import AgentRuntime
from app.loop.context import LoopContext, LoopLimits
from app.loop.engine import run_loop
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent
from app.llm.prompt_builder import build_system_prompt

logger = logging.getLogger(__name__)


@dataclass
class AgentCallInput:
    """统一调用入参"""
    user_message: str                              # 用户输入
    history: List[Dict[str, Any]] = field(default_factory=list)  # 对话历史
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    model: Optional[str] = None                   # 覆盖模型（空则用 runtime 默认）


async def call_agent(
    runtime: AgentRuntime,
    input: AgentCallInput,
) -> AsyncIterator[LoopEvent]:
    """
    统一智能体调用

    Args:
        runtime:  由 AgentBuilder 构建的智能体运行时配置
        input:    调用入参（用户消息、历史等）

    Yields:
        LoopEvent（thinking / delta / tool_call / tool_result / card / error / done）
    """
    message_id = input.message_id or str(uuid.uuid4())

    if runtime.agent_type == "internal":
        async for event in _call_internal(runtime, input, message_id):
            yield event
    elif runtime.agent_type == "external":
        async for event in _call_external(runtime, input, message_id):
            yield event
    else:
        yield ErrorEvent(code="UNKNOWN_AGENT_TYPE", message=f"Unknown agent_type: {runtime.agent_type}")
        yield DoneEvent(message_id=message_id, loop_rounds=0, total_duration=0)


async def _call_internal(
    runtime: AgentRuntime,
    input: AgentCallInput,
    message_id: str,
) -> AsyncIterator[LoopEvent]:
    """调用内部智能体：构建 LoopContext → run_loop"""
    capabilities = runtime.capabilities
    if capabilities is None:
        # fallback：使用全局注册表，并触发外部智能体 lazy 加载
        from app.capability.registry import registry as global_registry
        from app.bootstrap.capabilities import ensure_external_agents_registered
        capabilities = global_registry
        await ensure_external_agents_registered(capabilities)

    # 组装系统提示（含 capabilities 描述）
    cap_descriptions = capabilities.to_descriptions()
    full_system_prompt = build_system_prompt(
        cap_descriptions,
        extra_system=runtime.system_prompt,
    )

    limits = LoopLimits(
        max_rounds=runtime.limits.max_rounds,
        max_tool_phases=runtime.limits.max_tool_phases,
        timeout_seconds=runtime.limits.timeout_seconds,
    )

    ctx = LoopContext(
        user_message=input.user_message,
        history=input.history,
        capabilities=capabilities,
        system_prompt=full_system_prompt,
        limits=limits,
        model=input.model,
        message_id=message_id,
        session_id=input.session_id,
        agent_id=runtime.id,
        loop_mode=runtime.loop_mode,
    )

    async for event in run_loop(ctx):
        yield event


async def _call_external(
    runtime: AgentRuntime,
    input: AgentCallInput,
    message_id: str,
) -> AsyncIterator[LoopEvent]:
    """调用外部智能体：通过 A2A 协议"""
    from app.agents.a2a_client import call_a2a_agent

    logger.info("_call_external: agent=%s type=%s base_url=%s", runtime.name, runtime.agent_type, runtime.base_url)
    
    if not runtime.base_url:
        logger.error("_call_external: 无 base_url agent=%s", runtime.name)
        yield ErrorEvent(code="NO_BASE_URL", message=f"External agent {runtime.name} has no base_url")
        yield DoneEvent(message_id=message_id, loop_rounds=0, total_duration=0)
        return

    logger.info("_call_external 开始调用: base_url=%s, message_len=%d", runtime.base_url, len(input.user_message))
    
    async for event in call_a2a_agent(
        base_url=runtime.base_url,
        task=input.user_message,
        history=input.history,
        auth_token=runtime.auth_token or None,
        message_id=message_id,
    ):
        logger.info("_call_external event: type=%s", type(event).__name__)
        yield event
    
    logger.info("_call_external 完成")
