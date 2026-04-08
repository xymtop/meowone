"""Dispatch a task to a named remote A2A tool (same transport as `.meowone/agents.yaml`)."""
from __future__ import annotations

from typing import Any, Dict

from app.capability.tool_base import BaseTool


class SubagentSchedulerTool(BaseTool):
    name = "invoke_subagent"
    display_name = "Subagent scheduler"
    description = (
        "Delegate the current task to a registered remote A2A specialist agent (same transport as `.meowone/agents.yaml`). "
        "The main model continues after receiving the tool result (plan next steps, call more tools). "
        "Use this to dispatch work — do NOT attempt to execute tools directly yourself; "
        "only use this tool (or `list_internal_agents`) for work."
    )
    permission = "standard"
    category = "agents"
    tags = ("a2a", "delegate")

    parameters_schema = {
        "type": "object",
        "properties": {
            "agent_tool_name": {
                "type": "string",
                "description": "Registered tool name of the remote A2A agent.",
            },
            "task": {
                "type": "string",
                "description": "Full instruction for the specialist.",
            },
        },
        "required": ["agent_tool_name", "task"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        from app.capability.registry import registry
        from app.capability.tools.remote_a2a_agent import RemoteA2AAgentCapability

        name = str(params.get("agent_tool_name") or "").strip()
        task = str(params.get("task") or "").strip()
        if not name or not task:
            return "Error: agent_tool_name and task are required"
        cap = registry.get(name)
        if cap is None:
            return f"Error: no tool registered as `{name}`"
        if not isinstance(cap, RemoteA2AAgentCapability):
            return f"Error: `{name}` is not a remote A2A agent (cannot delegate)."
        return await cap.execute({"task": task})
