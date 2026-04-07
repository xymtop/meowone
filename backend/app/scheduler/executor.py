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
    base = float(len(text))
    penalty = (errors * 200.0) + (rounds * 5.0) + (duration / 1000.0)
    if not text:
        penalty += 500.0
    return base - penalty


async def execute_scheduled_turn(
    *,
    mode: str,
    run_input: LoopRunInput,
    task_tag: str | None = None,
) -> AsyncIterator[LoopEvent]:
    if mode == "direct":
        async for ev in run_loop(run_input):
            yield ev
        return

    message_id = run_input.message_id or str(uuid.uuid4())
    start = time.time()

    if mode == "master_slave":
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
        yield ThinkingEvent(step=1, description="Master phase: planning")
        plan_text, _, _, _ = await _run_once(planner_input)

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
        yield ThinkingEvent(step=2, description="Worker phase: executing subtasks")
        final_text, rounds, _dur, errors = await _run_once(worker_input)
        if errors:
            yield ErrorEvent(code="MASTER_SLAVE_PARTIAL", message="Some worker steps returned errors.")
        if final_text:
            yield DeltaEvent(message_id=message_id, content=final_text, done=False)
        yield DeltaEvent(message_id=message_id, content="", done=True)
        yield DoneEvent(
            message_id=message_id,
            loop_rounds=max(1, rounds),
            total_duration=(time.time() - start) * 1000,
        )
        return

    # swarm
    variants = [
        "Candidate A: prioritize speed and minimal steps.",
        "Candidate B: prioritize accuracy and verification.",
        "Candidate C: prioritize robustness and fallback paths.",
    ]
    yield ThinkingEvent(step=1, description="Swarm phase: running parallel candidates")
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
    results = await asyncio.gather(*tasks)

    best = max(results, key=lambda r: _score_candidate(r[0], r[1], r[2], r[3]))
    final_text, rounds, _dur, errors = best
    yield ThinkingEvent(step=2, description=f"Swarm convergence complete (task_tag={task_tag or 'general'})")
    if errors:
        yield ErrorEvent(code="SWARM_PARTIAL", message="Some candidate branches returned errors.")
    if final_text:
        yield DeltaEvent(message_id=message_id, content=final_text, done=False)
    yield DeltaEvent(message_id=message_id, content="", done=True)
    yield DoneEvent(
        message_id=message_id,
        loop_rounds=max(1, rounds),
        total_duration=(time.time() - start) * 1000,
    )
