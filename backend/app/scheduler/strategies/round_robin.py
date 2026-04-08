from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class RoundRobinStrategy(BaseStrategy):
    """轮询分配策略：负载均衡轮流分配任务"""

    name: str = "round_robin"
    description: str = "轮询分配：负载均衡轮流分配任务"
    config_schema: Dict[str, Any] = field(default_factory=dict)

    _current_index: int = 0

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """轮询选择目标"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="",
                reasoning="No targets available",
                confidence=0.0,
            )

        # 按 round_robin 顺序选择
        index = self._current_index % len(targets)
        self._current_index += 1

        target = targets[index]
        return SelectionResult(
            target_id=str(target.get("id", target.get("name", ""))),
            target_type=target.get("type", "agent"),
            reasoning=f"Round-robin selection: index {index}",
            confidence=1.0,
        )

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """分发任务"""
        import uuid
        execution_id = str(uuid.uuid4())
        return DispatchResult(
            success=True,
            execution_id=execution_id,
            output={"task": task, "target": target},
            error=None,
        )

    async def on_complete(self, result: Any, context: Dict) -> Any:
        return result

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        logger.error(f"Round-robin dispatch error: {error}")
        return {"error": str(error)}
