from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import logging

from app.scheduler.types import SchedulerDecision
from app.capability.runtime import CapabilityFilter

logger = logging.getLogger(__name__)


class SchedulerStrategy:
    """调度策略基类 - v2 兼容"""

    name: str

    def decide(self) -> SchedulerDecision:
        raise NotImplementedError


@dataclass(frozen=True)
class DirectStrategy:
    """直接执行策略 - v2"""
    name: str = "direct"

    def decide(self) -> SchedulerDecision:
        return SchedulerDecision(
            mode=self.name,
            system_hint=(
                "## Scheduler mode\n"
                "- Current mode: `direct`\n"
                "- Prefer direct execution for clear, single-owner tasks."
            ),
        )


@dataclass(frozen=True)
class MasterSlaveStrategy:
    """主从策略 - v2"""
    name: str = "master_slave"

    def decide(self) -> SchedulerDecision:
        return SchedulerDecision(
            mode=self.name,
            system_hint=(
                "## Scheduler mode\n"
                "- Current mode: `master_slave`\n"
                "- First decompose task into subtasks.\n"
                "- Delegate execution to specialist subagents when useful.\n"
                "- Merge sub-results and report one coherent outcome."
            ),
        )


@dataclass(frozen=True)
class SwarmStrategy:
    """蜂群策略 - v2"""
    name: str = "swarm"

    def decide(self) -> SchedulerDecision:
        return SchedulerDecision(
            mode=self.name,
            capability_filter=CapabilityFilter(deny_names=["run_terminal_cmd"]),
            system_hint=(
                "## Scheduler mode\n"
                "- Current mode: `swarm`\n"
                "- Explore multiple candidate plans in parallel where tasks are independent.\n"
                "- Compare outcomes, then converge to the best final answer.\n"
                "- Keep execution safe and bounded."
            ),
        )


def get_strategy_by_name(name: str) -> Optional[SchedulerStrategy]:
    """根据名称获取调度策略"""
    strategies = {
        "direct": DirectStrategy,
        "master_slave": MasterSlaveStrategy,
        "swarm": SwarmStrategy,
    }
    return strategies.get(name)


def list_strategies() -> List[str]:
    """列出所有可用策略"""
    return list({"direct", "master_slave", "swarm"})
