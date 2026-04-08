from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, AsyncIterator

from app.loop.runtime import run_loop, LoopEvent
from app.loop.input import LoopRunInput, LoopLimits
from app.loop.events import (
    ThinkingEvent, DeltaEvent, DoneEvent, ErrorEvent,
)
from app.plugins.registry import BaseLoop, LoopResult

logger = logging.getLogger(__name__)


@dataclass
class ReActLoopConfig:
    max_steps: int = 10
    model: str = ""


class ReActLoop(BaseLoop):
    """标准 ReAct Loop：思考 → 行动 → 观察"""

    name: str = "react"
    description: str = "标准 ReAct 模式：思考 → 行动 → 观察"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "max_steps": {"type": "integer", "default": 10, "description": "最大执行步数"},
    })

    async def run(
        self,
        agent_id: str,
        user_input: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> LoopResult:
        start_time = time.time()
        step_count = 0
        output = ""

        # 获取配置
        config = context.get("loop_config", {})
        max_steps = config.get("max_steps", 10)

        # 构建 Loop 输入
        loop_input = LoopRunInput(
            user_message=user_input,
            history=history,
            message_id=context.get("message_id"),
            model=context.get("model", ""),
        )

        try:
            async for event in self._run_with_limit(loop_input, max_steps):
                if isinstance(event, DeltaEvent):
                    output += event.content
                elif isinstance(event, DoneEvent):
                    pass
                elif isinstance(event, ErrorEvent):
                    output += f"\n[Error: {event.message}]"
                step_count += 1

            return LoopResult(
                output=output,
                stop_reason="completed",
                loop_rounds=step_count,
                duration_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            return LoopResult(
                output=output,
                stop_reason=f"error: {str(e)}",
                loop_rounds=step_count,
                duration_ms=int((time.time() - start_time) * 1000),
            )

    async def _run_with_limit(
        self, loop_input: LoopRunInput, max_steps: int
    ) -> AsyncIterator[LoopEvent]:
        """带步数限制的运行"""
        step = 0
        async for event in run_loop(loop_input):
            yield event
            step += 1
            if step >= max_steps:
                yield ErrorEvent(code="MAX_STEPS", message=f"Reached max steps limit: {max_steps}")
                break

    async def step(
        self, state: Dict[str, Any], context: Dict[str, Any]
    ) -> Any:
        """单步执行"""
        return await run_loop(
            LoopRunInput(
                user_message=state.get("input", ""),
                history=state.get("history", []),
            )
        )

    async def should_continue(self, state: Dict, context: Dict) -> bool:
        """判断是否继续执行"""
        steps = state.get("steps", 0)
        max_steps = context.get("loop_config", {}).get("max_steps", 10)
        return steps < max_steps
