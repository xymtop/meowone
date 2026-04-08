from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class DirectStrategy(BaseStrategy):
    """直接执行策略：直接分发到指定目标"""

    name: str = "direct"
    description: str = "直接执行：直接分发到指定目标"
    config_schema: Dict[str, Any] = field(default_factory=dict)

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """直接选择第一个目标"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="",
                reasoning="No targets available",
                confidence=0.0,
            )
        target = targets[0]
        return SelectionResult(
            target_id=str(target.get("id", target.get("name", ""))),
            target_type=target.get("type", "agent"),
            reasoning="Direct selection: first available target",
            confidence=1.0,
        )

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """分发任务到目标"""
        import uuid
        execution_id = str(uuid.uuid4())
        return DispatchResult(
            success=True,
            execution_id=execution_id,
            output={"task": task, "target": target},
            error=None,
        )

    async def on_complete(self, result: Any, context: Dict) -> Any:
        """完成回调"""
        logger.info(f"Direct dispatch completed: {result}")
        return result

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        """错误处理"""
        logger.error(f"Direct dispatch error: {error}")
        return {"error": str(error)}
