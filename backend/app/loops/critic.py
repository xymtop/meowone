"""批评-改进模式 Loop：生成 → 批评 → 改进."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.loop.runtime import run_loop
from app.loop.events import DeltaEvent, DoneEvent, ErrorEvent
from app.plugins.registry import BaseLoop, LoopResult

logger = logging.getLogger(__name__)


@dataclass
class CriticConfig:
    max_iterations: int = 3
    critique_threshold: float = 0.7


class CriticLoop(BaseLoop):
    """批评-改进模式 Loop：生成 → 批评 → 改进."""

    name: str = "critic"
    description: str = "批评-改进模式：生成 → 批评 → 改进"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "max_iterations": {"type": "integer", "default": 3, "description": "最大迭代次数"},
        "critique_threshold": {"type": "number", "default": 0.7, "description": "批评阈值"},
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
        max_iterations = config.get("max_iterations", 3)
        threshold = config.get("critique_threshold", 0.7)

        current_output = ""
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            logger.info(f"Critic Loop 迭代 {iteration}/{max_iterations}")

            # 阶段1：生成
            generation = await self._generate(user_input, current_output, history, context)
            output += f"\n## 迭代 {iteration} - 生成\n{generation}\n"

            # 阶段2：批评
            critique = await self._critique(generation, user_input, context)
            output += f"\n## 迭代 {iteration} - 批评\n{critique}\n"

            # 检查是否通过阈值
            score = self._parse_score(critique)
            if score >= threshold:
                output += f"\n通过批评阈值 ({score:.2f} >= {threshold:.2f})\n"
                break

            # 阶段3：改进
            current_output = await self._improve(generation, critique, context)
            output += f"\n## 迭代 {iteration} - 改进\n{current_output}\n"

        return LoopResult(
            output=output.strip(),
            stop_reason="completed" if iteration <= max_iterations else "max_iterations",
            loop_rounds=iteration,
            duration_ms=int((time.time() - start_time) * 1000),
        )

    async def _generate(
        self,
        task: str,
        previous_output: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> str:
        """生成阶段"""
        loop_input = context.get("loop_input")
        if not loop_input:
            return f"生成任务「{task}」的结果"

        result = ""
        async for event in run_loop(loop_input):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
        return result or "生成完成"

    async def _critique(
        self,
        generation: str,
        task: str,
        context: Dict[str, Any],
    ) -> str:
        """批评阶段"""
        loop_input = context.get("loop_input")
        if not loop_input:
            return "质量评分：0.8 - 生成内容基本符合要求"

        result = ""
        async for event in run_loop(loop_input):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
        return result or "质量评分：0.8 - 良好"

    async def _improve(
        self,
        generation: str,
        critique: str,
        context: Dict[str, Any],
    ) -> str:
        """改进阶段"""
        loop_input = context.get("loop_input")
        if not loop_input:
            return f"根据批评改进：{generation}"

        result = ""
        async for event in run_loop(loop_input):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
        return result or generation

    def _parse_score(self, critique: str) -> float:
        """从批评中提取分数"""
        import re
        match = re.search(r'(?:质量评分|评分|score)[:：]?\s*([0-9.]+)', critique)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass

        match = re.search(r'([0-9.]+)\s*/\s*1', critique)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass

        return 0.5

    async def step(
        self, state: Dict[str, Any], context: Dict[str, Any]
    ) -> Any:
        """单步执行"""
        phase = state.get("phase", "generate")
        if phase == "generate":
            return {"phase": "critique", "generation": await self._generate(
                state["input"], state.get("previous_output", ""), state.get("history", []), context
            )}
        elif phase == "critique":
            return {"phase": "improve", "critique": await self._critique(
                state["generation"], state["input"], context
            )}
        else:
            return await self._improve(state["generation"], state["critique"], context)

    async def should_continue(self, state: Dict, context: Dict) -> bool:
        """判断是否继续执行"""
        iteration = state.get("iteration", 1)
        config = context.get("loop_config", {})
        max_iterations = config.get("max_iterations", 3)
        return iteration < max_iterations