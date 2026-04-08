from __future__ import annotations

from typing import Dict

from app.scheduler.strategies import DirectStrategy, MasterSlaveStrategy, SchedulerStrategy, SwarmStrategy, HierarchicalStrategy
from app.scheduler.types import SchedulerDecision


class SchedulerRegistry:
    def __init__(self) -> None:
        self._strategies: Dict[str, SchedulerStrategy] = {}
        self.register(DirectStrategy())
        self.register(MasterSlaveStrategy())
        self.register(SwarmStrategy())
        self.register(HierarchicalStrategy())

    def register(self, strategy: SchedulerStrategy) -> None:
        self._strategies[strategy.name] = strategy

    def resolve(self, mode: str | None) -> SchedulerStrategy:
        key = (mode or "").strip() or "direct"
        return self._strategies.get(key, self._strategies["direct"])

    def decide(self, mode: str | None) -> SchedulerDecision:
        return self.resolve(mode).decide()


scheduler_registry = SchedulerRegistry()
