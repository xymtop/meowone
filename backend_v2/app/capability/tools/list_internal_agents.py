"""
列出内部智能体工具

从数据库 agents 表查询所有内部智能体。
"""
from __future__ import annotations

import json
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.services import agent_service


class ListInternalAgentsTool(BaseTool):
    name = "list_internal_agents"
    display_name = "List internal agents"
    description = "List all internal agents from the agents table."
    permission = "standard"
    category = "agents"
    tags = ("internal", "factory")

    parameters_schema = {"type": "object", "properties": {}}

    async def execute(self, params: Dict[str, Any]) -> str:
        _ = params
        items = await agent_service.list_agents(agent_type="internal")
        agents = [
            {"name": a.get("name"), "description": a.get("description", "")}
            for a in items
        ]
        return json.dumps({"ok": True, "count": len(agents), "agents": agents}, ensure_ascii=False)
