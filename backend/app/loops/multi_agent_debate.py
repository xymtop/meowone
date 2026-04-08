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
class DebateConfig:
    candidates: int = 3
    max_steps: int = 5


class MultiAgentDebateLoop(BaseLoop):
    """多智能体辩论 Loop：多个候选者并行思考后投票"""

    name: str = "multi_agent_debate"
    description: str = "多智能体辩论：多个候选者并行思考后投票"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "candidates": {"type": "integer", "default": 3, "description": "候选者数量"},
        "max_steps": {"type": "integer", "default": 5, "description": "最大辩论轮次"},
    })

    async def run(
        self,
        agent_id: str,
        user_input: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> LoopResult:
        start_time = time.time()
        config = context.get("loop_config", {})
        candidate_count = config.get("candidates", 3)

        # 启动多个候选者并行思考
        tasks = [
            self._candidate_think(i, user_input, history, context)
            for i in range(candidate_count)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 汇总结果（简化处理：取第一个有效结果）
        outputs = [r for r in results if isinstance(r, str)]
        final_output = "\n\n---\n\n".join(outputs) if outputs else "无有效结果"

        return LoopResult(
            output=final_output,
            stop_reason="completed",
            loop_rounds=candidate_count,
            duration_ms=int((time.time() - start_time) * 1000),
        )

    async def _candidate_think(
        self,
        index: int,
        user_input: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> str:
        """单个候选者思考"""
        result = ""
        async for event in run_loop(context.get("loop_input")):
            if isinstance(event, DeltaEvent):
                result += event.content
            elif isinstance(event, ErrorEvent):
                result += f"\n[Error: {event.message}]"
        return f"[候选者 {index + 1}]\n{result}"

    async def step(
        self, state: Dict[str, Any], context: Dict[str, Any]
    ) -> Any:
        """单步执行"""
        return await self._candidate_think(
            state.get("index", 0), state["input"], state.get("history", []), context
        )

    async def should_continue(self, state: Dict, context: Dict) -> bool:
        """判断是否继续执行"""
        index = state.get("index", 0)
        max_candidates = context.get("loop_config", {}).get("candidates", 3)
        return index < max_candidates
