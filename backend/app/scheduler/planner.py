from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass(frozen=True)
class PlanStep:
    id: str
    title: str
    parallel_group: str = ""


@dataclass(frozen=True)
class ExecutionPlan:
    mode: str
    summary: str
    steps: List[PlanStep] = field(default_factory=list)

    def to_event_payload(self) -> Dict[str, object]:
        return {
            "mode": self.mode,
            "summary": self.summary,
            "steps": [
                {"id": s.id, "title": s.title, "parallelGroup": s.parallel_group}
                for s in self.steps
            ],
        }


def build_execution_plan(*, mode: str, task_tag: str | None = None) -> ExecutionPlan:
    tag = (task_tag or "").strip() or "general"
    if mode == "master_slave":
        return ExecutionPlan(
            mode=mode,
            summary=f"Master decomposes task ({tag}) then delegates execution.",
            steps=[
                PlanStep(id="s1", title="Analyze goal and constraints"),
                PlanStep(id="s2", title="Split into executable subtasks"),
                PlanStep(id="s3", title="Delegate subtasks to specialists", parallel_group="workers"),
                PlanStep(id="s4", title="Merge outputs and deliver final result"),
            ],
        )
    if mode == "swarm":
        return ExecutionPlan(
            mode=mode,
            summary=f"Run parallel candidate attempts for {tag}, then converge.",
            steps=[
                PlanStep(id="s1", title="Generate multiple candidate plans"),
                PlanStep(id="s2", title="Execute candidates in parallel", parallel_group="swarm"),
                PlanStep(id="s3", title="Score candidates and select best"),
                PlanStep(id="s4", title="Synthesize final answer"),
            ],
        )
    return ExecutionPlan(
        mode="direct",
        summary=f"Direct execution path for {tag}.",
        steps=[
            PlanStep(id="s1", title="Solve task directly"),
            PlanStep(id="s2", title="Return result"),
        ],
    )
