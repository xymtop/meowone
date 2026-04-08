"""层级上报策略：任务逐级上报处理."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class HierarchicalStrategy(BaseStrategy):
    """层级上报策略：任务逐级上报处理."""

    name: str = "hierarchical"
    description: str = "层级上报：任务逐级上报处理"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "levels": {"type": "integer", "default": 3, "description": "层级深度"},
        "escalate_threshold": {"type": "integer", "default": 2, "description": "上报阈值"},
    })

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """选择最佳处理层级"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="agent",
                reasoning="No targets available",
                confidence=0.0,
            )

        # 计算任务复杂度
        complexity = self._calculate_complexity(task)

        config = context.get("strategy_config", {})
        levels = config.get("levels", 3)

        # 根据复杂度选择层级
        if complexity < 2:
            level = 1
        elif complexity < 4:
            level = 2
        else:
            level = min(levels, 3)

        target = targets[min(level - 1, len(targets) - 1)]
        target_id = str(target.get("id", target.get("name", "")))

        return SelectionResult(
            target_id=target_id,
            target_type="agent",
            reasoning=f"Hierarchical selection: level {level} for complexity {complexity}",
            confidence=1.0 - (complexity * 0.1),
        )

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """按层级分发任务"""
        execution_id = str(uuid.uuid4())
        config = context.get("strategy_config", {})
        levels = config.get("levels", 3)

        current_level = 1
        max_retries = 2
        result = None

        while current_level <= levels:
            try:
                # 尝试在当前层级处理
                result = await self._process_at_level(
                    task, target, current_level, context
                )

                # 检查是否需要上报
                if self._should_escalate(result, config):
                    current_level += 1
                    # 移动到上级目标
                    target = self._get_upper_target(targets, current_level)
                    if not target:
                        break
                    continue

                return DispatchResult(
                    success=True,
                    execution_id=execution_id,
                    output={
                        "level": current_level,
                        "result": result,
                        "escalated": False,
                    },
                    error=None,
                )

            except Exception as e:
                logger.error(f"Level {current_level} processing failed: {e}")
                if max_retries > 0:
                    max_retries -= 1
                    continue
                current_level += 1

        return DispatchResult(
            success=False,
            execution_id=execution_id,
            output={},
            error="Failed to process at any level",
        )

    async def _process_at_level(
        self,
        task: str,
        target: Dict[str, Any],
        level: int,
        context: Dict[str, Any],
    ) -> Any:
        """在指定层级处理任务"""
        # 这里应该调用实际的 agent 执行
        return {
            "level": level,
            "processed": True,
            "target": target.get("id"),
        }

    def _should_escalate(self, result: Any, config: Dict[str, Any]) -> bool:
        """判断是否需要上报"""
        if not isinstance(result, dict):
            return False

        error_count = result.get("error_count", 0)
        threshold = config.get("escalate_threshold", 2)

        return error_count >= threshold

    def _get_upper_target(
        self, targets: List[Dict[str, Any]], level: int
    ) -> Dict[str, Any] | None:
        """获取上级目标"""
        if level <= len(targets):
            return targets[level - 1]
        return targets[-1] if targets else None

    def _calculate_complexity(self, task: str) -> int:
        """计算任务复杂度"""
        complexity = 1

        # 基于任务长度
        if len(task) > 200:
            complexity += 1

        # 基于关键词
        complex_keywords = ["分析", "设计", "开发", "实现", "优化", "研究", "比较"]
        for kw in complex_keywords:
            if kw in task:
                complexity += 1

        return min(complexity, 5)

    async def on_complete(self, result: Any, context: Dict) -> Any:
        """完成回调"""
        return result

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        """错误处理"""
        logger.error(f"Hierarchical strategy error: {error}")
        return {"error": str(error), "target": target}