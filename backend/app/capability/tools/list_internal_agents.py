from __future__ import annotations

from typing import Any, Dict

from app.agents.internal_factory import internal_agent_factory
from app.capability.tool_base import BaseTool


class ListInternalAgentsTool(BaseTool):
    name = "list_internal_agents"
    display_name = "List internal agents"
    description = "List all internal subagents currently created in this backend runtime."
    permission = "standard"
    category = "agents"
    tags = ("internal", "factory")

    parameters_schema = {"type": "object", "properties": {}}

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        _ = params
        items = [spec.to_public_dict() for spec in await internal_agent_factory.list()]
        return {"ok": True, "count": len(items), "agents": items}
