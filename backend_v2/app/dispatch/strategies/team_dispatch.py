"""
Team Dispatch 调度策略 —— 团队分发

将用户任务分解为子任务，分配给团队成员并行/串行执行，最后汇总结果。

设计：
  - team_id 必须由用户在 strategy_config 中配置（业务语义，无法自动推导）
  - 团队成员来源：agent_ids_json（gateway 已预填充到 ctx.candidate_runtimes）
  - 其他参数（parallel、decompose_prompt、max_members）全部有默认值

strategy_config 格式：
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
from typing import Any, AsyncIterator, List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.dispatch.context import DispatchContext

from app.dispatch.registry import dispatch_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent, DeltaEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("team_dispatch")
async def team_dispatch_strategy(ctx: "DispatchContext") -> AsyncIterator[LoopEvent]:
    """
    团队分发策略

    team_id：必须从 strategy_config 获取（用户显式配置）
    团队成员：从 gateway 预填充的 ctx.candidate_runtimes 取
    """
    from app.agents.caller import call_agent, AgentCallInput

    config = ctx.strategy_config
    parallel = bool(config.get("parallel", True))
    max_members = int(config.get("max_members", 5))
    decompose_prompt = str(config.get("decompose_prompt") or "").strip()

    # team_id 必须用户配置（业务语义，无法自动推导）
    team_id = str(config.get("team_id") or "").strip()
    if not team_id:
        # 尝试从镜像 metadata_json.team_name 兜底
        team_id = str(config.get("team_name") or "").strip()
    if not team_id:
        yield ErrorEvent(
            code="MISSING_CONFIG",
            message="team_dispatch 策略需要在 strategy_config 中配置 team_id",
        )
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    # 团队成员来自 ctx.candidate_runtimes（gateway 从 agent_ids_json 预填充）
    all_members: List[Any] = list(ctx.candidate_runtimes)

    # 如果 gateway 没有预填充（直接从 agent_id 调用），则从 image.agent_ids_json 加载
    if not all_members and ctx.image_id:
        all_members = await _load_members_from_image(ctx.agent_id or "", ctx.image_id)

    if not all_members:
        yield ErrorEvent(code="NO_TEAM_MEMBERS", message=f"团队 {team_id} 没有可用成员")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    member_runtimes = all_members[:max_members]

    yield ThinkingEvent(
        step=1,
        description=f"团队 [{team_id}]：正在将任务分解给 {len(member_runtimes)} 个成员..."
    )

    # 分解任务
    subtasks = await _decompose_task(
        task=ctx.user_message,
        num_members=len(member_runtimes),
        decompose_prompt=decompose_prompt,
        model=ctx.model,
    )

    # 执行子任务
    async def _run_member(runtime: Any, subtask: str) -> str:
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
        tasks = [_run_member(r, s) for r, s in zip(member_runtimes, subtasks)]
        results: List[Any] = await asyncio.gather(*tasks, return_exceptions=True)
    else:
        results = []
        for idx, (r, subtask) in enumerate(zip(member_runtimes, subtasks), start=2):
            yield ThinkingEvent(step=idx, description=f"执行成员 {r.name}...")
            res = await _run_member(r, subtask)
            results.append(res)

    # 汇总结果
    summary_parts: List[str] = ["## 团队执行结果\n"]
    for i, (r, result) in enumerate(zip(member_runtimes, results), start=1):
        r_str = str(result) if not isinstance(result, Exception) else f"[错误: {result}]"
        summary_parts.append(f"**成员 {i}（{r.name}）**：\n{r_str}\n")

    summary = "\n".join(summary_parts)
    yield DeltaEvent(message_id=ctx.message_id, content=summary, done=False)
    yield DeltaEvent(message_id=ctx.message_id, content="", done=True)
    yield DoneEvent(message_id=ctx.message_id, loop_rounds=len(member_runtimes), total_duration=0)


async def _load_members_from_image(exclude_agent_id: str, image_id: str) -> List[Any]:
    """从 image.agent_ids_json 加载成员运行时"""
    from app.agents.builder import agent_builder
    from app.db.queries.agent_instances import get_agent_image_by_id

    try:
        image = await get_agent_image_by_id(image_id)
        if not image:
            return []
        agent_ids: List[str] = image.get("agent_ids_json") or []
        members: List[Any] = []
        for aid in agent_ids:
            if aid and aid != exclude_agent_id:
                r = await agent_builder.build_by_id(aid)
                if r:
                    members.append(r)
        return members
    except Exception:
        return []


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
            while len(lines) < num_members:
                lines.append(task)
            return lines[:num_members]
    except Exception as e:
        logger.warning("任务分解失败，回退到复制策略: %s", e)

    return [f"[子任务 {i+1}/{num_members}] {task}" for i in range(num_members)]
