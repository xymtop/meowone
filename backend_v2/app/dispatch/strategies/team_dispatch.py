"""
Team Dispatch 调度策略 —— 团队分发

设计理念：
  - 领导-成员架构：领导负责接收任务、分析任务、指派成员、汇总汇报
  - 团队成员信息动态注入：成员的名称、能力等信息自动注入到领导和其他成员的提示词中
  - 配置极简：只需配置领导 ID（leader_id），成员信息自动获取

strategy_config 格式：
    {
        "leader_id": "领导智能体 ID（必填）",
        "parallel": true,              // 是否并行执行，默认 true
        "overtime_threshold": 30,       // 加班阈值（秒），默认 30
        "max_iterations": 5             // 最大迭代次数，默认 5
    }

注册名称: "team_dispatch"
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, AsyncIterator, Dict, List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.dispatch.context import DispatchContext

from app.dispatch.registry import dispatch_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent, DeltaEvent

logger = logging.getLogger(__name__)


@dispatch_strategy("team_dispatch")
async def team_dispatch_strategy(ctx: "DispatchContext") -> AsyncIterator[LoopEvent]:
    """
    团队分发策略

    领导-成员架构：
      1. 领导接收用户消息
      2. 领导分析任务
      3. 领导指派团队成员
      4. 成员执行任务（可并行）
      5. 成员汇报给领导
      6. 领导汇总并向用户汇报
    """
    from app.agents.caller import call_agent, AgentCallInput

    config = ctx.strategy_config
    parallel = bool(config.get("parallel", True))
    max_iterations = int(config.get("max_iterations", 5))

    logger.info("team_dispatch 收到 config: %s, agent_id: %s, image_id: %s", config, ctx.agent_id, ctx.image_id)

    # 领导 ID 优先级：strategy_config.leader_id > ctx.agent_id
    leader_id = str(config.get("leader_id") or ctx.agent_id or "").strip()
    if not leader_id:
        yield ErrorEvent(
            code="MISSING_CONFIG",
            message="team_dispatch 策略需要在 strategy_config 中配置 leader_id，或通过 agent_id 指定领导智能体",
        )
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    # ── 构建领导运行时 ──
    leader_runtime = await _build_agent_runtime(leader_id, ctx)
    if not leader_runtime:
        yield ErrorEvent(code="LEADER_NOT_FOUND", message=f"领导智能体 {leader_id} 未找到")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    leader_name = getattr(leader_runtime, "name", "团队领导")

    # ── 获取团队成员列表 ──
    members, member_names = await _load_team_members(leader_id, ctx)
    if not members:
        yield ErrorEvent(code="NO_TEAM_MEMBERS", message=f"团队 {leader_name} 没有可用成员")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    # ── 构建团队成员上下文（用于注入到提示词）──
    team_context = _build_team_context(members, member_names)

    # ── 阶段 1：领导接收任务 ──
    yield ThinkingEvent(step=1, description=f"{leader_name} 已经收到您的消息，正在分析任务...")

    # ── 阶段 2：领导分析任务 ──
    analysis_prompt = f"""你是一个团队的领导智能体，正在分析用户任务。

用户任务：
{ctx.user_message}

团队成员信息：
{team_context}

请分析这个任务，思考需要指派哪些成员来完成，并给出任务分配计划。
"""
    analysis_result = await _call_leader(leader_runtime, analysis_prompt, ctx)
    yield ThinkingEvent(step=2, description=f"{leader_name} 分析完毕，正在制定任务分配方案...")

    # ── 阶段 3：领导指派任务 ──
    yield ThinkingEvent(step=3, description=f"{leader_name} 正在向团队成员指派任务...")

    assignment_prompt = f"""你是一个团队的领导智能体，需要将任务分配给团队成员。

用户任务：
{ctx.user_message}

团队成员信息：
{team_context}

请为每个成员分配具体的子任务，格式如下（每行一个成员的任务）：
【成员名称】：具体任务描述

请确保任务分配合理，充分利用每个成员的专长。
"""
    assignment_result = await _call_leader(leader_runtime, assignment_prompt, ctx)

    # 解析分配结果
    task_assignments = _parse_assignments(assignment_result, member_names)

    # ── 阶段 4：成员执行任务 ──
    if parallel:
        # 并行执行
        yield ThinkingEvent(step=4, description=f"{leader_name} 已指派任务，{'、'.join(member_names[:-1])} 和 {member_names[-1]} 开始并行工作...")

        async def _run_member_work(runtime: Any, member_name: str, subtask: str) -> Dict[str, Any]:
            """运行单个成员执行任务"""
            work_prompt = f"""你是团队成员 {member_name}，正在执行领导分配的任务。

你的任务：
{subtask}

请认真完成这个任务，并汇报工作结果。
"""
            result = await _call_member(runtime, work_prompt, ctx, member_name)
            return {"name": member_name, "result": result}

        coros = [_run_member_work(r, n, t) for r, n, t in zip(members, member_names, task_assignments)]
        pending = [asyncio.ensure_future(c) for c in coros]
        fut_to_idx: Dict[Any, int] = {id(f): i for i, f in enumerate(pending)}

        results: List[Dict[str, Any]] = [{}] * len(members)
        finished = 0

        while pending:
            done_set, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for fut in done_set:
                idx = fut_to_idx[id(fut)]
                results[idx] = fut.result()
                finished += 1

                # 生成详细状态事件
                member_name = results[idx]["name"]
                if finished < len(members):
                    remaining = len(members) - finished
                    remaining_names = [r["name"] for r in results if r and r["name"] != member_name]
                    if remaining > 1:
                        yield ThinkingEvent(
                            step=5,
                            description=f"{member_name} 任务干完了，正在向 {leader_name} 汇报工作。剩余 {remaining} 位成员加班干活中：{'、'.join(remaining_names)}"
                        )
                    else:
                        yield ThinkingEvent(
                            step=5,
                            description=f"{member_name} 任务干完了，正在向 {leader_name} 汇报工作。最后一位成员 {remaining_names[0] if remaining_names else ''} 正在收尾..."
                        )
                else:
                    yield ThinkingEvent(
                        step=6,
                        description=f"{member_name} 任务干完了，最后一位成员完成，所有人正在向领导汇报..."
                    )

    else:
        # 串行执行
        results = []
        for i, (runtime, member_name, subtask) in enumerate(zip(members, member_names, task_assignments)):
            if i == 0:
                yield ThinkingEvent(
                    step=4,
                    description=f"{leader_name} 指派 {member_name} 执行任务：{subtask}"
                )
            else:
                yield ThinkingEvent(
                    step=4 + i,
                    description=f"{member_name} 正在干活...（{i+1}/{len(members)}）"
                )

            result = await _call_member(runtime, subtask, ctx, member_name)
            results.append({"name": member_name, "result": result})

            if i < len(members) - 1:
                next_member = member_names[i + 1]
                yield ThinkingEvent(
                    step=5 + i,
                    description=f"{member_name} 任务干完了，正在向 {leader_name} 汇报。{next_member} 接手工作..."
                )
            else:
                yield ThinkingEvent(
                    step=5 + i,
                    description=f"{member_name} 任务干完了，正在向 {leader_name} 汇报。最后一位成员完成..."
                )

    # ── 阶段 5：领导汇总结果 ──
    yield ThinkingEvent(step=90, description=f"所有成员任务完成，{leader_name} 正在准备向您汇报...")

    # 构建汇报上下文
    member_reports = "\n\n".join([
        f"【{r['name']} 的汇报】：\n{r['result']}" for r in results
    ])

    report_prompt = f"""你是一个团队的领导智能体，需要汇总成员的汇报并向用户汇报最终结果。

用户原始任务：
{ctx.user_message}

团队成员任务分配：
{assignment_result}

成员汇报内容：
{member_reports}

请汇总所有成员的工作结果，用清晰的结构向用户汇报最终成果。
"""
    final_report = await _call_leader(leader_runtime, report_prompt, ctx)

    # ── 阶段 6：汇报给用户 ──
    yield ThinkingEvent(step=98, description=f"{leader_name} 正在准备向您汇报...")
    yield ThinkingEvent(step=99, description="任务完成")
    yield DeltaEvent(message_id=ctx.message_id, content=final_report, done=False)
    yield DeltaEvent(message_id=ctx.message_id, content="", done=True)
    yield DoneEvent(message_id=ctx.message_id, loop_rounds=len(members) + 2, total_duration=0)


async def _build_agent_runtime(agent_id: str, ctx: "DispatchContext") -> Any:
    """根据 agent_id 构建运行时"""
    from app.agents.builder import agent_builder

    try:
        runtime = await agent_builder.build_by_id(agent_id)
        return runtime
    except Exception as e:
        logger.error("构建智能体运行时失败 %s: %s", agent_id, e)
        return None


async def _load_team_members(leader_id: str, ctx: "DispatchContext") -> tuple[List[Any], List[str]]:
    """从领导配置中加载团队成员列表"""
    from app.agents.builder import agent_builder
    from app.db.queries.agent_instances import get_agent_image_by_id

    members = []
    member_names = []

    async def _load_from_image(image_id: str) -> None:
        """从镜像加载成员"""
        try:
            image = await get_agent_image_by_id(image_id)
            if image:
                agent_ids = image.get("agent_ids_json") or []
                for aid in agent_ids:
                    if aid and aid != leader_id:
                        r = await agent_builder.build_by_id(aid)
                        if r:
                            members.append(r)
                            member_names.append(getattr(r, "name", f"成员{len(members)}"))
        except Exception as e:
            logger.error("从镜像 %s 加载成员失败: %s", image_id, e)

    try:
        # 优先从 ctx.image_id 获取（gateway 已预填充）
        if ctx.image_id:
            await _load_from_image(ctx.image_id)

        # 其次从领导的运行时属性获取
        if not members:
            leader_runtime = await agent_builder.build_by_id(leader_id)
            if leader_runtime:
                # 从 image_id 属性获取
                image_id = getattr(leader_runtime, "image_id", None) or getattr(leader_runtime, "_image_id", None)
                if image_id:
                    await _load_from_image(image_id)

        # 最后从领导 runtime 的 metadata 获取
        if not members:
            leader_runtime = await agent_builder.build_by_id(leader_id)
            if leader_runtime:
                metadata = getattr(leader_runtime, "metadata_json", {}) or {}
                agent_ids = metadata.get("agent_ids_json") or []
                for aid in agent_ids:
                    if aid and aid != leader_id:
                        r = await agent_builder.build_by_id(aid)
                        if r:
                            members.append(r)
                            member_names.append(getattr(r, "name", f"成员{len(members)}"))

    except Exception as e:
        logger.error("加载团队成员失败: %s", e)

    return members, member_names


def _build_team_context(members: List[Any], member_names: List[str]) -> str:
    """构建团队成员上下文，用于注入到提示词中"""
    lines = []
    for i, (runtime, name) in enumerate(zip(members, member_names), start=1):
        # 获取成员的能力描述
        capabilities = getattr(runtime, "capabilities", None)
        if capabilities:
            # CapabilitiesRegistry 有 list() 方法或 _items 属性
            if hasattr(capabilities, "list"):
                caps = capabilities.list()
            elif hasattr(capabilities, "_items"):
                caps = list(capabilities._items.values())
            elif hasattr(capabilities, "values"):
                caps = list(capabilities.values())
            else:
                caps = []
            cap_desc = "、".join([getattr(c, "name", str(c)) for c in caps]) if caps else "综合能力"
        else:
            cap_desc = "综合能力"

        # 获取成员描述
        description = getattr(runtime, "description", "") or getattr(runtime, "prompt", "") or ""

        lines.append(f"{i}. {name}（能力：{cap_desc}）")
        if description:
            lines.append(f"   描述：{description[:100]}{'...' if len(description) > 100 else ''}")

    return "\n".join(lines) if lines else "（暂无团队成员信息）"


def _parse_assignments(assignment_text: str, member_names: List[str]) -> List[str]:
    """解析领导的任务分配结果"""
    import re

    assignments = []
    for name in member_names:
        # 匹配 【成员名称】：任务 或 成员名称：任务
        pattern = rf"【?{re.escape(name)}】?[：:]\s*(.+?)(?=\n【?[^\s】:]+[】:]|$)"
        match = re.search(pattern, assignment_text, re.DOTALL)
        if match:
            task = match.group(1).strip()
            # 清理任务描述
            task = re.sub(r'^\d+[.、]\s*', '', task)
            assignments.append(task)
        else:
            assignments.append(f"请 {name} 完成分配的任务")

    # 如果解析失败，使用默认分配
    if len(assignments) < len(member_names):
        assignments.extend([f"请 {name} 完成自己的任务" for name in member_names[len(assignments):]])

    return assignments[:len(member_names)]


async def _call_leader(runtime: Any, prompt: str, ctx: "DispatchContext") -> str:
    """调用领导智能体"""
    from app.agents.caller import call_agent, AgentCallInput

    call_input = AgentCallInput(
        user_message=prompt,
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


async def _call_member(runtime: Any, task: str, ctx: "DispatchContext", member_name: str) -> str:
    """调用成员智能体"""
    from app.agents.caller import call_agent, AgentCallInput

    # 动态注入成员名称到提示词
    member_prompt = f"""你是团队成员 {member_name}，正在执行领导分配的任务。

请认真完成任务，汇报结果时使用 {member_name} 的身份。

任务内容：
{task}
"""

    call_input = AgentCallInput(
        user_message=member_prompt,
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
