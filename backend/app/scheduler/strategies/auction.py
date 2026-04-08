"""竞拍模式策略：智能体竞争任务."""
from __future__ import annotations

import logging
import uuid
import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class AuctionStrategy(BaseStrategy):
    """竞拍模式策略：智能体竞争任务."""

    name: str = "auction"
    description: str = "竞拍模式：智能体竞争任务"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "bidding_timeout": {"type": "integer", "default": 30, "description": "竞标超时时间(秒)"},
        "min_bid_score": {"type": "number", "default": 0.5, "description": "最低竞标分数"},
    })

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """通过竞拍选择最佳执行者"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="agent",
                reasoning="No agents available for bidding",
                confidence=0.0,
            )

        config = context.get("strategy_config", {})
        timeout = config.get("bidding_timeout", 30)

        # 收集竞标
        bids = await self._collect_bids(task, targets, context, timeout)

        if not bids:
            return SelectionResult(
                target_id=str(targets[0].get("id", "")),
                target_type="agent",
                reasoning="No valid bids, default to first target",
                confidence=0.1,
            )

        # 选择最佳竞标
        best_bid = max(bids, key=lambda x: x["score"])
        min_score = config.get("min_bid_score", 0.5)

        if best_bid["score"] < min_score:
            return SelectionResult(
                target_id=str(targets[0].get("id", "")),
                target_type="agent",
                reasoning="No bid meets minimum score threshold",
                confidence=0.0,
            )

        return SelectionResult(
            target_id=best_bid["agent_id"],
            target_type="agent",
            reasoning=f"Won auction with score {best_bid['score']:.2f}: {best_bid['reasoning']}",
            confidence=best_bid["score"],
        )

    async def _collect_bids(
        self,
        task: str,
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
        timeout: int,
    ) -> List[Dict[str, Any]]:
        """收集所有目标的竞标"""
        async def get_bid(target: Dict[str, Any]) -> Dict[str, Any]:
            try:
                return await self._get_bid_from_agent(task, target, context)
            except Exception as e:
                logger.warning(f"Bid from {target.get('id')} failed: {e}")
                return {"agent_id": target.get("id"), "score": 0, "reasoning": ""}

        # 设置超时
        try:
            bids = await asyncio.wait_for(
                asyncio.gather(*[get_bid(t) for t in targets]),
                timeout=timeout,
            )
            return [b for b in bids if b.get("score", 0) > 0]
        except asyncio.TimeoutError:
            logger.warning("Bidding timeout reached")
            return []

    async def _get_bid_from_agent(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """从单个智能体获取竞标"""
        # 模拟竞标评估
        agent_id = target.get("id", target.get("name", "unknown"))
        capabilities = target.get("capabilities", [])

        # 基于能力匹配度计算分数
        score = 0.5  # 基础分数

        # 检查能力匹配
        for cap in capabilities:
            if any(kw in str(cap).lower() for kw in task.lower().split()):
                score += 0.2

        score = min(score, 1.0)

        return {
            "agent_id": str(agent_id),
            "score": score,
            "reasoning": f"Matched {len(capabilities)} capabilities for task",
        }

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """将任务分发给出价者"""
        execution_id = str(uuid.uuid4())

        return DispatchResult(
            success=True,
            execution_id=execution_id,
            output={
                "task": task,
                "winner_id": target.get("id"),
                "type": "auction",
            },
            error=None,
        )

    async def on_complete(self, result: Any, context: Dict) -> Any:
        """完成回调"""
        return result

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        """错误处理"""
        logger.error(f"Auction strategy error: {error}")
        return {"error": str(error), "target": target}