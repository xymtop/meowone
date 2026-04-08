"""民主协商策略：多个智能体协商后决策."""
from __future__ import annotations

import logging
import uuid
import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List

from app.plugins.registry import BaseStrategy, SelectionResult, DispatchResult

logger = logging.getLogger(__name__)


class DemocraticStrategy(BaseStrategy):
    """民主协商策略：多个智能体协商后决策."""

    name: str = "democratic"
    description: str = "民主协商：多个智能体协商后决策"
    config_schema: Dict[str, Any] = field(default_factory=lambda: {
        "quorum": {"type": "integer", "default": 3, "description": "法定人数"},
        "consensus_threshold": {"type": "number", "default": 0.6, "description": "共识阈值"},
        "max_rounds": {"type": "integer", "default": 3, "description": "最大协商轮次"},
    })

    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """通过民主协商选择最佳决策"""
        if not targets:
            return SelectionResult(
                target_id="",
                target_type="agent",
                reasoning="No agents available for deliberation",
                confidence=0.0,
            )

        config = context.get("strategy_config", {})
        quorum = config.get("quorum", 3)
        consensus_threshold = config.get("consensus_threshold", 0.6)
        max_rounds = config.get("max_rounds", 3)

        # 限制参与者数量
        participants = targets[:quorum]

        # 开始多轮协商
        proposals = await self._deliberate(task, participants, context, max_rounds)

        # 汇总投票
        decision = self._aggregate_votes(proposals, consensus_threshold)

        return SelectionResult(
            target_id=decision["winner_id"],
            target_type="agent",
            reasoning=decision["reasoning"],
            confidence=decision["confidence"],
        )

    async def _deliberate(
        self,
        task: str,
        participants: List[Dict[str, Any]],
        context: Dict[str, Any],
        max_rounds: int,
    ) -> List[Dict[str, Any]]:
        """多轮协商"""
        proposals = []

        for round_num in range(max_rounds):
            round_proposals = await asyncio.gather(
                *[self._get_proposal(task, participant, round_num, context) for participant in participants],
                return_exceptions=True,
            )

            for i, proposal in enumerate(round_proposals):
                if isinstance(proposal, Exception):
                    logger.warning(f"Proposal from participant {i} failed: {proposal}")
                    continue

                proposals.append({
                    "round": round_num + 1,
                    "participant_id": participants[i].get("id"),
                    "proposal": proposal,
                    "votes": 1,  # 初始一票
                })

            # 早期停止：如果已有足够共识
            if self._check_early_consensus(proposals, 0.8):
                break

        return proposals

    async def _get_proposal(
        self,
        task: str,
        participant: Dict[str, Any],
        round_num: int,
        context: Dict[str, Any],
    ) -> str:
        """获取单个参与者的提案"""
        participant_id = participant.get("id", participant.get("name", "unknown"))

        # 模拟提案生成
        # 在实际实现中，应该调用 agent 来生成提案
        return f"Proposal from {participant_id} for task: {task[:50]}..."

    def _aggregate_votes(
        self,
        proposals: List[Dict[str, Any]],
        threshold: float,
    ) -> Dict[str, Any]:
        """汇总投票并做出决策"""
        if not proposals:
            return {
                "winner_id": "",
                "reasoning": "No proposals received",
                "confidence": 0.0,
            }

        # 统计每个参与者的票数
        vote_counts: Dict[str, int] = {}
        for proposal in proposals:
            participant_id = str(proposal["participant_id"])
            vote_counts[participant_id] = vote_counts.get(participant_id, 0) + proposal.get("votes", 1)

        # 找出得票最多者
        if not vote_counts:
            return {
                "winner_id": str(proposals[0]["participant_id"]),
                "reasoning": "First proposal wins by default",
                "confidence": 0.3,
            }

        total_votes = sum(vote_counts.values())
        winner_id = max(vote_counts, key=vote_counts.get)
        winner_votes = vote_counts[winner_id]
        confidence = winner_votes / total_votes if total_votes > 0 else 0

        reasoning = f"Received {winner_votes} votes out of {total_votes} ({confidence:.1%} consensus)"

        return {
            "winner_id": winner_id,
            "reasoning": reasoning,
            "confidence": confidence,
        }

    def _check_early_consensus(
        self,
        proposals: List[Dict[str, Any]],
        threshold: float,
    ) -> bool:
        """检查是否达成早期共识"""
        if len(proposals) < 2:
            return False

        vote_counts: Dict[str, int] = {}
        for proposal in proposals:
            participant_id = str(proposal["participant_id"])
            vote_counts[participant_id] = vote_counts.get(participant_id, 0) + 1

        if not vote_counts:
            return False

        total_votes = len(proposals)
        max_votes = max(vote_counts.values())
        consensus = max_votes / total_votes

        return consensus >= threshold

    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """将任务分发给协商胜出者"""
        execution_id = str(uuid.uuid4())

        return DispatchResult(
            success=True,
            execution_id=execution_id,
            output={
                "task": task,
                "winner_id": target.get("id"),
                "type": "democratic",
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
        logger.error(f"Democratic strategy error: {error}")
        return {"error": str(error), "target": target}