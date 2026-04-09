"""
Team Dispatch 调度策略 —— 团队分发

将用户任务分解为子任务，分配给团队成员并行/串行执行，最后汇总结果。

策略配置 JSON 格式：
    {
        "team_id": "团队 ID（必填）",
        "decompose_prompt": "自定义分解提示词（可选）",
        "parallel": true,          // 是否并行执行，默认 true
        "max_members": 5           // 最多使用几个成员，默认 5
    }

注册名称: "team_dispatch"
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, AsyncIterator, Dict, List

from app.dispatch.registry import dispatch_strategy
from app.dispatch.context import DispatchContext
from app.loop.events import (
    LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent, DeltaEvent,
)

logger = logging.getLogger(__name__)


@dispatch_strategy("team_dispatch")
async def team_dispatch_strategy(ctx: DispatchContext) -> AsyncIterator[LoopEvent]:
    """
    团队分发策略

    流程：
    1. 从 strategy_config 读取 team_id
    2. 从数据库查询团队成员 agent_id 列表
    3. 用 LLM 将任务分解为 N 个子任务（N = 成员数）
    4. 并行/串行调用各成员智能体
    5. 汇总结果输出
    """
    from app.agents.builder import agent_builder
    from app.agents.caller import call_agent, AgentCallInput
    from app.db.queries.teams import get_team_by_id, list_team_member_agent_ids
    from app.loop.events import DeltaEvent

    config = ctx.strategy_config
    team_id = str(config.get("team_id") or "").strip()
    parallel = bool(config.get("parallel", True))
    max_members = int(config.get("max_members", 5))
    decompose_prompt = str(config.get("decompose_prompt") or "").strip()

    if not team_id:
        yield ErrorEvent(code="MISSING_CONFIG", message="team_dispatch 策略需要 strategy_config.team_id")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    # 查询团队成员
    member_ids = await list_team_member_agent_ids(team_id)
    if not member_ids:
        yield ErrorEvent(code="NO_TEAM_MEMBERS", message=f"团队 {team_id} 没有成员")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    member_ids = member_ids[:max_members]

    yield ThinkingEvent(step=1, description=f"团队分发：正在将任务分解给 {len(member_ids)} 个团队成员...")

    # 分解任务（用 LLM 生成子任务，或简单复制）
    subtasks = await _decompose_task(
        task=ctx.user_message,
        num_members=len(member_ids),
        decompose_prompt=decompose_prompt,
        model=ctx.model,
    )

    # 执行子任务
    async def _run_member(member_id: str, subtask: str) -> str:
        runtime = await agent_builder.build_by_id(member_id)
        if not runtime:
            return f"[成员 {member_id} 未找到]"
        call_input = AgentCallInput(
            user_message=subtask,
            history=ctx.history,
            session_id=ctx.session_id,
            message_id=str(uuid.uuid4()),
            model=ctx.model,
        )
        result_parts: List[str] = []
        async for event in call_agent(runtime, call_input):
            if isinstance(event, DeltaEvent) and event.content:
                result_parts.append(event.content)
        return "".join(result_parts).strip()

    if parallel:
        yield ThinkingEvent(step=2, description="并行执行团队成员任务...")
        tasks = [_run_member(mid, subtask) for mid, subtask in zip(member_ids, subtasks)]
        results: List[Any] = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        results = []
        for idx, (mid, subtask) in enumerate(zip(member_ids, subtasks), start=2):
            yield ThinkingEvent(step=idx, description=f"执行成员 {mid}...")
            r = await _run_member(mid, subtask)
            results.append(r)

    # 汇总结果
    summary_parts: List[str] = ["## 团队执行结果\n"]
    for i, (mid, result) in enumerate(zip(member_ids, results), start=1):
        r_str = str(result) if not isinstance(result, Exception) else f"[错误: {result}]"
        summary_parts.append(f"**成员 {i}（{mid}）**：\n{r_str}\n")

    summary = "\n".join(summary_parts)
    yield DeltaEvent(message_id=ctx.message_id, content=summary, done=False)
    yield DeltaEvent(message_id=ctx.message_id, content="", done=True)
    yield DoneEvent(message_id=ctx.message_id, loop_rounds=len(member_ids), total_duration=0)


async def _decompose_task(
    task: str,
    num_members: int,
    decompose_prompt: str,
    model: str | None,
) -> List[str]:
    """用 LLM 将任务分解为子任务，失败时回退到简单复制"""
    if num_members <= 1:
        return [task]

    prompt_text = decompose_prompt or (
        f"请将以下任务分解为 {num_members} 个子任务，每个子任务一行，不要编号，直接输出子任务内容：\n\n{task}"
    )

    try:
        from app.llm.client import chat_completion_stream
        content = ""
        async for chunk in chat_completion_stream(
            messages=[{"role": "user", "content": prompt_text}],
            tools=None,
            model=model,
        ):
            if chunk["type"] == "content_delta":
                content += chunk["content"]

        lines = [ln.strip() for ln in content.strip().splitlines() if ln.strip()]
        if lines:
            # 补齐或截断到 num_members
            while len(lines) < num_members:
                lines.append(task)
            return lines[:num_members]
    except Exception as e:
        logger.warning("任务分解失败，回退到复制策略: %s", e)

    # Fallback：直接复制
    return [f"[子任务 {i+1}/{num_members}] {task}" for i in range(num_members)]
