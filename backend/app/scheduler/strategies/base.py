"""
调度策略基类模块

定义调度器的策略接口和内置策略实现。

内置策略：
- DirectStrategy: 直接执行策略
- MasterSlaveStrategy: 主从策略
- SwarmStrategy: 群策略
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.capability.runtime import CapabilityFilter
from app.scheduler.types import SchedulerDecision


class SchedulerStrategy(Protocol):
    """调度策略协议

    所有调度策略必须实现此协议。
    """
    name: str

    def decide(self) -> SchedulerDecision:
        """做出调度决策

        Returns:
            SchedulerDecision: 调度决策
        """
        ...


@dataclass(frozen=True)
class DirectStrategy:
    """直接执行策略

    适用于明确、单一所有者的任务，直接执行不做分解。
    """
    name: str = "direct"

    def decide(self) -> SchedulerDecision:
        """做出直接执行决策"""
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
    """主从策略

    适用于复杂任务：
    1. 主节点负责任务分解和规划
    2. 工作节点负责具体执行
    3. 最终合并子结果输出
    """
    name: str = "master_slave"

    def decide(self) -> SchedulerDecision:
        """做出主从执行决策"""
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
    """群策略

    适用于需要探索多种方案的复杂任务：
    1. 并行运行多个候选方案
    2. 每个候选有不同的优先级（速度、准确性、健壮性）
    3. 比较结果并收敛到最优方案
    """
    name: str = "swarm"

    def decide(self) -> SchedulerDecision:
        """做出群执行决策"""
        return SchedulerDecision(
            mode=self.name,
            capability_filter=CapabilityFilter(deny_names=["run_terminal_cmd"]),  # 禁用危险命令
            system_hint=(
                "## Scheduler mode\n"
                "- Current mode: `swarm`\n"
                "- Explore multiple candidate plans in parallel where tasks are independent.\n"
                "- Compare outcomes, then converge to the best final answer.\n"
                "- Keep execution safe and bounded."
            ),
        )
