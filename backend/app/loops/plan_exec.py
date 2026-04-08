from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.loop.runtime import run_loop
from app.loop.events import DeltaEvent, DoneEvent, ErrorEvent
from app.plugins.registry import BaseLoop, LoopResult

logger = logging.getLogger(__name__)


@dataclass
class PlanExecConfig:
    max_plan_depth: int = 3
    max_exec_steps: int = 10


class PlanExecLoop(BaseLoop):
    """计划-执行分离 Loop：先规划再逐步执行"""

    name: str = "plan_exec"
    description: str = "计划-执行分离：先规划再逐步执行"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "max_plan_depth": {"type": "integer", "default": 3, "description": "最大计划深度"},
        "max_exec_steps": {"type": "integer", "default": 10, "description": "最大执行步数"},
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
        max_exec_steps = config.get("max_exec_steps", 10)

        # 第一阶段：规划
        plan = await self._plan(user_input, history, context)

        # 第二阶段：执行
        exec_result = await self._execute(plan, context, max_exec_steps)

        return LoopResult(
            output=f"# 计划\n{plan}\n\n# 执行结果\n{exec_result}",
            stop_reason="completed",
            loop_rounds=2,
            duration_ms=int((time.time() - start_time) * 1000),
        )

    async def _plan(
        self,
        task: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> str:
        """规划阶段：生成执行计划"""
        # 这里简化处理，实际应该调用 LLM 生成计划
        return f"任务「{task}」执行计划：\n1. 分析需求\n2. 制定步骤\n3. 逐步执行\n4. 返回结果"

    async def _execute(
        self,
        plan: str,
        context: Dict[str, Any],
        max_steps: int,
    ) -> str:
        """执行阶段：按计划执行"""
        result = ""
        step = 0
        async for event in run_loop(context.get("loop_input")):
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
        phase = state.get("phase", "plan")
        if phase == "plan":
            return {"phase": "exec", "plan": await self._plan(state["input"], state.get("history", []), context)}
        else:
            return await self._execute(state["plan"], context, state.get("max_steps", 10))

    async def should_continue(self, state: Dict, context: Dict) -> bool:
        """判断是否继续执行"""
        return state.get("phase") != "done"
