"""层级式执行 Loop：上级规划，下级执行."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.loop.runtime import run_loop
from app.loop.events import DeltaEvent, DoneEvent, ErrorEvent
from app.loop.input import LoopRunInput
from app.loop.context import LoopContext
from app.plugins.registry import BaseLoop, LoopResult

logger = logging.getLogger(__name__)


@dataclass
class HierarchicalConfig:
    levels: int = 2
    max_steps_per_level: int = 5


class HierarchicalLoop(BaseLoop):
    """层级式执行 Loop：上级规划，下级执行."""

    name: str = "hierarchical"
    description: str = "层级式执行：上级规划，下级执行"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "levels": {"type": "integer", "default": 2, "description": "层级深度"},
        "max_steps_per_level": {"type": "integer", "default": 5, "description": "每层最大步数"},
    })

    async def run(
        self,
        agent_id: str,
        user_input: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> LoopResult:
        start_time = time.time()
        output = ""

        config = context.get("loop_config", {})
        levels = config.get("levels", 2)
        max_steps = config.get("max_steps_per_level", 5)

        # 第一层：高级规划
        plan = await self._plan_top_level(user_input, history, context)

        # 逐层执行
        current_task = plan
        for level in range(levels):
            level_output = await self._execute_level(
                level + 1,
                current_task,
                context,
                max_steps,
            )
            output += f"\n## 第 {level + 1} 层执行结果\n{level_output}\n"

            # 如果还有子任务，传递给下一层
            if level < levels - 1:
                current_task = level_output

        return LoopResult(
            output=output.strip(),
            stop_reason="completed",
            loop_rounds=levels,
            duration_ms=int((time.time() - start_time) * 1000),
        )

    async def _plan_top_level(
        self,
        task: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> str:
        """顶层规划：生成执行计划"""
        loop_input = context.get("loop_input")
        if not loop_input:
            return f"任务「{task}」的执行计划：\n1. 分析任务\n2. 分解子任务\n3. 执行并汇总"

        result = ""
        async for event in run_loop(loop_input):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
        return result or "执行完成"

    async def _execute_level(
        self,
        level: int,
        task: str,
        context: Dict[str, Any],
        max_steps: int,
    ) -> str:
        """执行单层任务"""
        result = ""
        loop_input = context.get("loop_input")

        if not loop_input:
            return f"第 {level} 层执行完成"

        step = 0
        async for event in run_loop(loop_input):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
            step += 1
            if step >= max_steps:
                break

        return result or "执行完成"

    async def step(
        self, state: Dict[str, Any], context: Dict[str, Any]
    ) -> Any:
        """单步执行"""
        level = state.get("level", 1)
        task = state.get("task", "")
        return await self._execute_level(level, task, context, state.get("max_steps", 5))

    async def should_continue(self, state: Dict, context: Dict) -> bool:
        """判断是否继续执行"""
        level = state.get("level", 1)
        config = context.get("loop_config", {})
        max_levels = config.get("levels", 2)
        return level < max_levels