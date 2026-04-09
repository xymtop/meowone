"""
创建内部智能体工具

将内部智能体配置持久化到数据库 agents 表。
"""
from __future__ import annotations

import json
from typing import Any, Dict, List

from app.capability.tool_base import BaseTool
from app.services import agent_service


class CreateInternalAgentTool(BaseTool):
    name = "create_internal_agent"
    display_name = "Create internal agent"
    description = "Create or update an internal agent profile in the database."
    permission = "standard"
    category = "agents"
    tags = ("internal", "factory")

    parameters_schema = {
        "type": "object",
        "properties": {
            "agent_name": {"type": "string"},
            "description": {"type": "string"},
            "system_prompt": {"type": "string"},
            "mcp_servers": {"type": "array", "items": {"type": "string"}},
            "agent_skills": {"type": "array", "items": {"type": "string"}},
            "allow_tools": {"type": "array", "items": {"type": "string"}},
            "deny_tools": {"type": "array", "items": {"type": "string"}},
            "max_rounds": {"type": "integer"},
            "max_tool_phases": {"type": "integer"},
            "timeout_seconds": {"type": "integer"},
            "prompt_key": {"type": "string"},
            "loop_mode": {"type": "string", "enum": ["react", "plan_exec"]},
        },
        "required": ["agent_name"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        name = str(params.get("agent_name") or "").strip()
        if not name:
            return json.dumps({"ok": False, "error": "agent_name is required"}, ensure_ascii=False)

        try:
            await agent_service.upsert_internal_agent(
                name=name,
                description=str(params.get("description") or "").strip(),
                system_prompt=str(params.get("system_prompt") or "").strip(),
                mcp_servers=_list_str(params.get("mcp_servers")),
                agent_skills=_list_str(params.get("agent_skills")),
                allow_tools=_list_str(params.get("allow_tools")),
                deny_tools=_list_str(params.get("deny_tools")),
                max_rounds=params.get("max_rounds"),
                max_tool_phases=params.get("max_tool_phases"),
                timeout_seconds=params.get("timeout_seconds"),
                prompt_key=str(params.get("prompt_key") or "").strip(),
                loop_mode=str(params.get("loop_mode") or "react").strip() or "react",
            )
            return json.dumps({"ok": True, "agent_name": name}, ensure_ascii=False)
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False)


def _list_str(value: Any) -> List[str]:
    if not value:
        return []
    if isinstance(value, list):
        return [str(x) for x in value if str(x).strip()]
    return [str(value)]
