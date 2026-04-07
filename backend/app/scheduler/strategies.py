from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.capability.runtime import CapabilityFilter
from app.scheduler.types import SchedulerDecision


class SchedulerStrategy(Protocol):
    name: str

    def decide(self) -> SchedulerDecision:
        ...


@dataclass(frozen=True)
class DirectStrategy:
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
