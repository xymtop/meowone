"""
Capability Match 调度策略 —— 能力匹配

适用场景：从多个候选智能体中，通过 LLM 语义匹配找到最适合当前任务的智能体。

设计：
  - 无需任何用户配置，候选池自动推导（优先级递减）：
    1. gateway 预填充的 ctx.candidate_runtimes（来自 image.agent_ids_json）
    2. 当前组织下所有 enabled agents
  - 用户可通过 strategy_config.match_model 覆盖匹配模型

注册名称: "capability_match"
"""
from __future__ import annotations

import logging
from typing import AsyncIterator, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.agents.runtime import AgentRuntime
    from app.dispatch.context import DispatchContext

from app.dispatch.registry import dispatch_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("capability_match")
async def capability_match_strategy(ctx: "DispatchContext") -> AsyncIterator[LoopEvent]:
    """
    能力匹配策略

    推导顺序：
    1. ctx.candidate_runtimes（gateway 预填充，image.agent_ids_json）
    2. 当前组织下所有 enabled agents
    3. 返回错误
    """
    from app.agents.builder import agent_builder
    from app.agents.caller import call_agent, AgentCallInput
    from app.db.queries.agents import list_agents

    candidates: List["AgentRuntime"] = list(ctx.candidate_runtimes)

    # Fallback: 从所有 enabled agents 构建候选池
    if not candidates:
        logger.info("capability_match: 候选池为空，尝试从所有 enabled agents 构建")
        all_rows = await list_agents(enabled_only=True)
        for row in all_rows:
            # 排除当前 agent 自身
            if ctx.agent_id and str(row.get("id") or "") == ctx.agent_id:
                continue
            r = await agent_builder.build_by_id(str(row.get("id") or ""))
            if r:
                candidates.append(r)

    if not candidates:
        yield ErrorEvent(code="NO_CANDIDATES", message="无法推导候选智能体列表")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    if len(candidates) == 1:
        logger.info("capability_match: 只有一个候选智能体 %s，直接调用", candidates[0].name)
        runtime = candidates[0]
    else:
        yield ThinkingEvent(
            step=1,
            description=f"能力匹配：从 {len(candidates)} 个候选智能体中选择最佳匹配..."
        )
        match_model: Optional[str] = ctx.strategy_config.get("match_model") or ctx.model
        runtime = await _match_best(ctx.user_message, candidates, match_model)

    yield ThinkingEvent(step=2, description=f"已匹配到智能体：{runtime.name}，开始执行...")
    logger.info("capability_match → 选中智能体 %s", runtime.name)

    call_input = AgentCallInput(
        user_message=ctx.user_message,
        history=ctx.history,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        model=ctx.model,
    )
    async for event in call_agent(runtime, call_input):
        yield event


async def _match_best(
    task: str,
    candidates: List["AgentRuntime"],
    model: Optional[str],
) -> "AgentRuntime":
    """用 LLM 语义匹配最适合的智能体，失败时返回第一个"""
    if len(candidates) == 1:
        return candidates[0]

    agent_list = "\n".join(
        f"{i+1}. name={c.name}, description={c.description or '无描述'}"
        for i, c in enumerate(candidates)
    )
    prompt = (
        f"根据以下用户任务，从候选智能体列表中选出最适合的一个。"
        f"只输出序号（数字），不要输出其他内容。\n\n"
        f"用户任务：{task}\n\n"
        f"候选智能体：\n{agent_list}"
    )

    try:
        from app.llm.client import chat_completion_stream
        content = ""
        async for chunk in chat_completion_stream(
            messages=[{"role": "user", "content": prompt}],
            tools=None,
            model=model,
        ):
            if chunk["type"] == "content_delta":
                content += chunk["content"]

        idx_str = content.strip().split()[0].rstrip(".")
        idx = int(idx_str) - 1
        if 0 <= idx < len(candidates):
            return candidates[idx]
    except Exception as e:
        logger.warning("能力匹配 LLM 选择失败，fallback 到第一个: %s", e)

    return candidates[0]
