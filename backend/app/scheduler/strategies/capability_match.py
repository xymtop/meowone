from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class CapabilityMatchStrategy(BaseStrategy):
    """能力匹配策略：根据任务需求匹配最佳智能体"""

    name: str = "capability_match"
    description: str = "能力匹配：根据任务需求匹配最佳智能体"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "match_fields": {
            "type": "array",
            "default": ["capabilities"],
            "description": "匹配的字段列表",
        },
    })

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """根据能力匹配选择最佳目标"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="",
                reasoning="No targets available",
                confidence=0.0,
            )

        # 获取匹配字段
        config = context.get("strategy_config", {})
        match_fields = config.get("match_fields", ["capabilities"])

        # 提取任务需求中的能力标签
        required = set()
        for field_name in match_fields:
            reqs = task_requirements.get(field_name, [])
            if isinstance(reqs, list):
                required.update(str(r) for r in reqs)

        # 匹配最佳目标
        best_target = None
        best_score = -1
        best_reason = ""

        for target in targets:
            score = 0
            matched = []
            for field_name in match_fields:
                target_caps = target.get(field_name, [])
                if isinstance(target_caps, list):
                    for cap in target_caps:
                        if str(cap) in required:
                            score += 1
                            matched.append(str(cap))

            if score > best_score:
                best_score = score
                best_target = target
                best_reason = f"Matched capabilities: {', '.join(matched)}"

        if best_target is None:
            best_target = targets[0]
            best_reason = "Fallback: no capability match, selecting first target"

        return SelectionResult(
            target_id=str(best_target.get("id", best_target.get("name", ""))),
            target_type=best_target.get("type", "agent"),
            reasoning=best_reason,
            confidence=best_score / max(len(required), 1) if required else 1.0,
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
        logger.error(f"Capability match dispatch error: {error}")
        return {"error": str(error)}
