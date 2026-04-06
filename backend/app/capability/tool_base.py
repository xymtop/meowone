"""Base tool metadata + structured tool results (e.g. terminate loop after subagent)."""
from __future__ import annotations

from abc import ABC
from dataclasses import dataclass
from typing import Any, List

from app.capability.base import BaseCapability


@dataclass
class ToolExecutionResult:
    """Wrap tool output; `stop_loop` ends the agent loop without another LLM round (e.g. A2A reply is final)."""

    payload: Any
    stop_loop: bool = False


class BaseTool(BaseCapability, ABC):
    """
    Convention for registered tools: display name, permission tag, category.
    `permission` is informational until request-level RBAC is wired (e.g. admin-only bash).
    """

    display_name: str = ""
    permission: str = "standard"  # standard | sensitive | admin
    category: str = "general"
    tags: tuple[str, ...] = ()

    def describe_for_prompt(self) -> str:
        line = f"- **{self.name}** ({self.display_name or self.name}) [{self.permission}]: {self.description}"
        if self.tags:
            line += f" — tags: {', '.join(self.tags)}"
        return line
