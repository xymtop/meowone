"""团队分发策略：分解任务并分配给团队成员."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class TeamDispatchStrategy(BaseStrategy):
    """团队分发策略：分解任务并分配给团队成员."""

    name: str = "team_dispatch"
    description: str = "团队分发：分解任务并分配给团队成员"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "parallel": {"type": "boolean", "default": True, "description": "是否并行执行"},
        "max_members": {"type": "integer", "default": 5, "description": "最大成员数"},
    })

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """选择团队进���任务分发"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="team",
                reasoning="No teams available",
                confidence=0.0,
            )

        config = context.get("strategy_config", {})
        max_members = config.get("max_members", 5)

        # 选择第一个可用的团队
        team = targets[0]
        team_id = str(team.get("id", team.get("name", "")))

        return SelectionResult(
            target_id=team_id,
            target_type="team",
            reasoning=f"Selected team for task distribution (max {max_members} members)",
            confidence=1.0,
        )

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """分发任务到团队成员"""
        import asyncio

        execution_id = str(uuid.uuid4())
        config = context.get("strategy_config", {})
        parallel = config.get("parallel", True)

        # 获取团队成员
        members = target.get("member_agent_ids", [])
        if not members:
            return DispatchResult(
                success=False,
                execution_id=execution_id,
                output={},
                error="No team members found",
            )

        # 限制成员数量
        max_members = config.get("max_members", 5)
        members = members[:max_members]

        # 分解任务
        subtasks = self._decompose_task(task, len(members))

        # 分发到成员
        results = []
        if parallel:
            tasks = [
                self._dispatch_to_member(subtask, member, context)
                for subtask, member in zip(subtasks, members)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            for subtask, member in zip(subtasks, members):
                result = await self._dispatch_to_member(subtask, member, context)
                results.append(result)

        return DispatchResult(
            success=True,
            execution_id=execution_id,
            output={
                "team_id": target.get("id"),
                "subtasks": len(subtasks),
                "results": results,
            },
            error=None,
        )

    async def _dispatch_to_member(
        self,
        subtask: str,
        member_id: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """分发到单个成员"""
        try:
            # 这里应该调用实际的 agent 执行
            # 目前简化处理
            return {
                "member_id": member_id,
                "subtask": subtask,
                "status": "dispatched",
            }
        except Exception as e:
            logger.error(f"Failed to dispatch to member {member_id}: {e}")
            return {
                "member_id": member_id,
                "subtask": subtask,
                "status": "error",
                "error": str(e),
            }

    def _decompose_task(self, task: str, num_members: int) -> List[str]:
        """将任务分解为子任务"""
        # 简化：按顺序分配
        parts = max(1, num_members)
        return [f"[子任务 {i+1}/{parts}] {task}" for i in range(parts)]

    async def on_complete(self, result: Any, context: Dict) -> Any:
        """合并结果"""
        output = result.get("output", {})
        results = output.get("results", [])

        # 合并各成员的结果
        merged = []
        for r in results:
            if isinstance(r, dict) and r.get("status") == "success":
                merged.append(r.get("result", ""))

        return {
            "merged_results": merged,
            "total_count": len(merged),
        }

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        """错误处理"""
        logger.error(f"Team dispatch error: {error}")
        return {"error": str(error), "target": target}