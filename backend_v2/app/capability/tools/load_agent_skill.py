"""Load full SKILL.md for one Agent Skill (progressive disclosure)."""
from __future__ import annotations

import json
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.config_loaders import format_skill_activation_for_model, resolve_agent_skill


class LoadAgentSkillTool(BaseTool):
    name = "load_agent_skill"
    display_name = "Load Agent Skill"
    description = (
        "Load the full instructions for one Agent Skill from `.meowone/skills/<name>/SKILL.md`. "
        "The system prompt only lists skill names and descriptions (progressive disclosure). "
        "Call this when the user's task matches a skill's description, before following its guidance. "
        "Parameter `skill_name` must match the skill's `name` field or its directory name under `.meowone/skills/`."
    )
    permission = "standard"
    category = "skills"
    tags = ("skills", "context")

    parameters_schema = {
        "type": "object",
        "properties": {
            "skill_name": {
                "type": "string",
                "description": "Skill id: same as in the Agent Skills inventory (name or folder name).",
            },
        },
        "required": ["skill_name"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        q = str(params.get("skill_name") or "").strip()
        if not q:
            return json.dumps({"error": "skill_name is required"}, ensure_ascii=False)
        info = resolve_agent_skill(q)
        if info is None:
            return json.dumps(
                {
                    "error": f"Unknown skill: {q!r}",
                    "hint": "Use a name from the Agent Skills inventory in the system prompt.",
                },
                ensure_ascii=False,
            )
        try:
            text = format_skill_activation_for_model(info)
        except OSError as e:
            return json.dumps({"error": str(e)}, ensure_ascii=False)
        return text
