"""
Capability Match 调度策略 —— 能力匹配

从候选智能体列表中，通过 LLM 语义匹配找到最适合当前任务的智能体，然后调用它。

策略配置 JSON 格式：
    {
        "candidate_agent_ids": ["agent-a-id", "agent-b-id", "agent-c-id"],
        "match_model": "gpt-4o"    // 可选，语义匹配用的模型
    }

注册名称: "capability_match"
"""
from __future__ import annotations

import json
import logging
from typing import AsyncIterator, Dict, List, Optional

from app.dispatch.registry import dispatch_strategy
from app.dispatch.context import DispatchContext
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("capability_match")
async def capability_match_strategy(ctx: DispatchContext) -> AsyncIterator[LoopEvent]:
    """
    能力匹配策略

    流程：
    1. 从 strategy_config 读取 candidate_agent_ids
    2. 加载所有候选智能体的 AgentRuntime（获取 name + description）
    3. 通过 LLM 语义匹配，选出最适合当前任务的智能体
    4. 调用选中的智能体
    """
    from app.agents.builder import agent_builder
    from app.agents.caller import call_agent, AgentCallInput

    config = ctx.strategy_config
    candidate_ids: List[str] = [str(x) for x in (config.get("candidate_agent_ids") or []) if x]
    match_model: Optional[str] = config.get("match_model") or ctx.model

    if not candidate_ids:
        yield ErrorEvent(
            code="MISSING_CONFIG",
            message="capability_match 策略需要 strategy_config.candidate_agent_ids"
        )
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    yield ThinkingEvent(step=1, description=f"能力匹配：从 {len(candidate_ids)} 个候选智能体中选择最佳匹配...")

    # 加载候选智能体
    candidates = []
    for aid in candidate_ids:
        runtime = await agent_builder.build_by_id(aid)
        if runtime:
            candidates.append(runtime)
        else:
            logger.warning("候选智能体未找到: %s", aid)

    if not candidates:
        yield ErrorEvent(code="NO_CANDIDATES", message="所有候选智能体均未找到")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    # 用 LLM 选出最佳智能体
    selected = await _match_best(ctx.user_message, candidates, match_model)

    yield ThinkingEvent(step=2, description=f"已匹配到智能体：{selected.name}，开始执行...")
    logger.info("capability_match → 选中智能体 %s", selected.name)

    call_input = AgentCallInput(
        user_message=ctx.user_message,
        history=ctx.history,
        session_id=ctx.session_id,
        message_id=ctx.message_id,
        model=ctx.model,
    )
    async for event in call_agent(selected, call_input):
        yield event


async def _match_best(task: str, candidates, model: Optional[str]):
    """用 LLM 语义匹配最适合的智能体，失败时返回第一个"""
    if len(candidates) == 1:
        return candidates[0]

    # 构建候选列表描述
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

        # 解析序号
        idx_str = content.strip().split()[0].rstrip(".")
        idx = int(idx_str) - 1
        if 0 <= idx < len(candidates):
            return candidates[idx]
    except Exception as e:
        logger.warning("能力匹配 LLM 选择失败，fallback 到第一个: %s", e)

    return candidates[0]
