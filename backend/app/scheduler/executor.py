"""
调度器执行器模块

支持多种调度模式的执行：
- direct: 直接执行
- master_slave: 主从模式（先规划后执行）
- swarm: 群模式（并行执行多个候选方案并选择最优）
"""

from __future__ import annotations

import asyncio
import time
import uuid
from dataclasses import replace
from typing import AsyncIterator, List, Tuple

from app.loop.events import DeltaEvent, DoneEvent, ErrorEvent, LoopEvent, ThinkingEvent
from app.loop.input import LoopRunInput
from app.loop.runtime import run_loop


async def _run_once(run_input: LoopRunInput) -> Tuple[str, int, float, int]:
    """运行一次完整的循环

    执行循环并收集结果。

    Args:
        run_input: 循环运行输入

    Returns:
        元组 (输出文本, 轮次数, 耗时毫秒, 错误数)
    """
    text_parts: List[str] = []
    rounds = 0
    duration = 0.0
    error_count = 0
    
    async for ev in run_loop(run_input):
        if isinstance(ev, DeltaEvent) and ev.content:
            text_parts.append(ev.content)
        elif isinstance(ev, DoneEvent):
            rounds = ev.loop_rounds
            duration = ev.total_duration
        elif isinstance(ev, ErrorEvent):
            error_count += 1
    
    return ("".join(text_parts).strip(), rounds, duration, error_count)


def _score_candidate(text: str, rounds: int, duration: float, errors: int) -> float:
    """计算候选方案得分

    综合考虑输出长度、轮次数、耗时和错误数。

    Args:
        text: 输出文本
        rounds: 轮次数
        duration: 耗时（毫秒）
        errors: 错误数

    Returns:
        得分（越高越好）
    """
    base = float(len(text))
    # 各项惩罚
    penalty = (errors * 200.0) + (rounds * 5.0) + (duration / 1000.0)
    # 空输出额外惩罚
    if not text:
        penalty += 500.0
    return base - penalty


async def execute_scheduled_turn(
    *,
    mode: str,
    run_input: LoopRunInput,
    task_tag: str | None = None,
) -> AsyncIterator[LoopEvent]:
    """调度执行

    根据调度模式执行任务。
    
    支持的模式：
    - direct: 直接执行
    - master_slave: 主从模式
    - swarm: 群模式

    Args:
        mode: 调度模式
        run_input: 循环运行输入
        task_tag: 任务标签

    Yields:
        循环事件
    """
    # 直接模式：直接运行循环
    if mode == "direct":
        async for ev in run_loop(run_input):
            yield ev
        return

    message_id = run_input.message_id or str(uuid.uuid4())
    start = time.time()

    # 主从模式：先规划后执行
    if mode == "master_slave":
        # 主阶段：生成执行计划
        planner_input = replace(
            run_input,
            message_id=message_id,
            extra_system=(
                run_input.extra_system
                + "\n\n## Master phase\n"
                + "First produce a concise numbered execution plan. "
                + "No final answer in this phase."
            ),
        )
        yield ThinkingEvent(step=1, description="主阶段：正在规划...")
        plan_text, _, _, _ = await _run_once(planner_input)

        # 工作阶段：按照计划执行
        worker_input = replace(
            run_input,
            message_id=message_id,
            extra_system=(
                run_input.extra_system
                + "\n\n## Worker phase\n"
                + "Execute and finalize using this plan:\n"
                + plan_text
            ),
        )
        yield ThinkingEvent(step=2, description="工作阶段：正在执行子任务...")
        final_text, rounds, _dur, errors = await _run_once(worker_input)
        
        if errors:
            yield ErrorEvent(code="MASTER_SLAVE_PARTIAL", message="部分工作阶段出现错误。")
        if final_text:
            yield DeltaEvent(message_id=message_id, content=final_text, done=False)
        yield DeltaEvent(message_id=message_id, content="", done=True)
        yield DoneEvent(
            message_id=message_id,
            loop_rounds=max(1, rounds),
            total_duration=(time.time() - start) * 1000,
        )
        return

    # 群模式：并行执行多个候选方案
    variants = [
        "Candidate A: prioritize speed and minimal steps.",  # 优先速度和简洁
        "Candidate B: prioritize accuracy and verification.",  # 优先准确和验证
        "Candidate C: prioritize robustness and fallback paths.",  # 优先健壮性和备用方案
    ]
    yield ThinkingEvent(step=1, description="群阶段：正在并行运行候选方案...")
    
    tasks = []
    for idx, hint in enumerate(variants, start=1):
        candidate_input = replace(
            run_input,
            message_id=message_id,
            extra_system=(
                run_input.extra_system
                + "\n\n## Swarm candidate\n"
                + f"{hint}\n"
                + "Avoid destructive actions unless absolutely necessary."
            ),
        )
        tasks.append(_run_once(candidate_input))
        _ = idx
    
    # 并行执行所有候选
    results = await asyncio.gather(*tasks)

    # 选择最优方案
    best = max(results, key=lambda r: _score_candidate(r[0], r[1], r[2], r[3]))
    final_text, rounds, _dur, errors = best
    
    yield ThinkingEvent(step=2, description=f"群阶段完成，已选择最优方案 (task_tag={task_tag or 'general'})")
    if errors:
        yield ErrorEvent(code="SWARM_PARTIAL", message="部分候选分支出现错误。")
    if final_text:
        yield DeltaEvent(message_id=message_id, content=final_text, done=False)
    yield DeltaEvent(message_id=message_id, content="", done=True)
    yield DoneEvent(
        message_id=message_id,
        loop_rounds=max(1, rounds),
        total_duration=(time.time() - start) * 1000,
    )
