from __future__ import annotations

from typing import Any, Dict, List

from app.agents.internal_factory import InternalAgentSpec, internal_agent_factory
from app.capability.tool_base import BaseTool


class CreateInternalAgentTool(BaseTool):
    name = "create_internal_agent"
    display_name = "Create internal agent"
    description = "Create or update an internal subagent profile using prompt, skills, MCP hints, and tool policy."
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
            "loop_mode": {"type": "string", "enum": ["react", "plan_exec", "critic", "hierarchical"]},
        },
        "required": ["agent_name"],
    }

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        name = str(params.get("agent_name") or "").strip()
        if not name:
            return {"ok": False, "error": "agent_name is required"}
        spec = InternalAgentSpec(
            name=name,
            description=str(params.get("description") or "").strip(),
            system_prompt=str(params.get("system_prompt") or "").strip(),
            mcp_servers=[str(x) for x in (params.get("mcp_servers") or []) if str(x).strip()],
            agent_skills=[str(x) for x in (params.get("agent_skills") or []) if str(x).strip()],
            allow_tools=[str(x) for x in (params.get("allow_tools") or []) if str(x).strip()],
            deny_tools=[str(x) for x in (params.get("deny_tools") or []) if str(x).strip()],
            max_rounds=params.get("max_rounds"),
            max_tool_phases=params.get("max_tool_phases"),
            timeout_seconds=params.get("timeout_seconds"),
            prompt_key=str(params.get("prompt_key") or "").strip(),
            loop_mode=str(params.get("loop_mode") or "react").strip() or "react",
        )
        saved = await internal_agent_factory.create(spec)
        return {"ok": True, "agent": saved.to_public_dict()}
