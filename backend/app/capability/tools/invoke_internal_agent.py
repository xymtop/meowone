from __future__ import annotations

from typing import Any, Dict

from app.agents.internal_factory import internal_agent_factory
from app.capability.tool_base import BaseTool


class InvokeInternalAgentTool(BaseTool):
    name = "invoke_internal_agent"
    display_name = "Invoke internal agent"
    description = (
        "Delegate the current task to a named internal subagent for execution. "
        "The subagent receives full tool access (sandbox, file, terminal, etc.) and returns its result here. "
        "Use this when the task requires tool execution — do NOT attempt to execute tools directly yourself; "
        "only use `invoke_internal_agent` (or `list_internal_agents` to discover agents) for work."
    )
    permission = "standard"
    category = "agents"
    tags = ("internal", "delegate")

    parameters_schema = {
        "type": "object",
        "properties": {
            "agent_name": {"type": "string"},
            "task": {"type": "string"},
        },
        "required": ["agent_name", "task"],
    }

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        name = str(params.get("agent_name") or "").strip()
        task = str(params.get("task") or "").strip()
        if not name or not task:
            return {"ok": False, "error": "agent_name and task are required"}
        return await internal_agent_factory.invoke(name=name, task=task)
