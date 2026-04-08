from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

from app.agents.definition import AgentDefinition
from app.capability.registry import CapabilityRegistry, registry
from app.capability.runtime import CapabilityFilter, CapabilityRuntime
from app.loop.input import LoopLimits
from app.services import prompt_service, skill_service


@dataclass
class AgentRuntimePlan:
    agent_name: str
    agent_type: str
    resolved_system_prompt: str
    resolved_capabilities: CapabilityRegistry
    resolved_limits: LoopLimits
    execution_transport: str
    loop_mode: str = "react"


class RestrictedCallMcpTool:
    name = "call_mcp_tool"
    display_name = "Call MCP tool (restricted)"
    description = "Invoke only MCP servers explicitly bound to this agent."
    permission = "sensitive"
    category = "mcp"
    tags = ("mcp", "restricted")
    parameters_schema = {
        "type": "object",
        "properties": {
            "server": {"type": "string", "enum": []},
            "tool": {"type": "string"},
            "arguments": {"type": "object"},
        },
        "required": ["server", "tool"],
    }

    def __init__(self, base_capability: Any, allowed_servers: List[str]) -> None:
        self._base = base_capability
        self._allowed = {x for x in allowed_servers if x}
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "server": {"type": "string", "enum": sorted(self._allowed)},
                "tool": {"type": "string"},
                "arguments": {"type": "object"},
            },
            "required": ["server", "tool"],
        }

    async def execute(self, params: Dict[str, Any]) -> str:
        server = str(params.get("server") or "").strip()
        if server not in self._allowed:
            return f"Error: MCP server `{server}` is not allowed for this agent"
        return await self._base.execute(params)

    def to_openai_tool(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


class AgentPlanBuilder:
    def __init__(self) -> None:
        self._runtime = CapabilityRuntime(registry)

    async def build(
        self,
        definition: AgentDefinition,
        *,
        overrides: Dict[str, Any] | None = None,
        channel_id: str = "agent_execution",
    ) -> AgentRuntimePlan:
        definition.validate()
        text_parts: List[str] = [f"## Agent\n- name: `{definition.name}`"]
        if definition.description:
            text_parts.append(f"- description: {definition.description}")

        if definition.resources.prompt_key:
            prompt = await prompt_service.get_prompt(definition.resources.prompt_key)
            if prompt and str(prompt.get("content_md") or "").strip():
                text_parts.append("### Prompt template")
                text_parts.append(str(prompt.get("content_md") or "").strip())

        skill_bodies = await self._resolve_skill_bodies(definition.resources.skill_names)
        if skill_bodies:
            text_parts.append("### Skills")
            text_parts.extend(skill_bodies)

        if definition.resources.system_prompt_overlay:
            text_parts.append("### Agent overlay")
            text_parts.append(definition.resources.system_prompt_overlay)

        cap_filter = CapabilityFilter(
            allow_names=definition.tool_policy.allow_tools or None,
            deny_names=definition.tool_policy.deny_tools or None,
        )
        selected = self._runtime.resolve(filter=cap_filter, channel_id=channel_id)
        constrained = self._apply_mcp_whitelist(selected, definition.resources.mcp_servers)

        merged_limits = self._resolve_limits(definition=definition, overrides=overrides or {})
        transport = "external_a2a" if definition.agent_type == "external" else "internal_loop"
        from app.loop.runtime import DEFAULT_LOOP_MODE
        loop_mode = definition.loop_mode or DEFAULT_LOOP_MODE
        return AgentRuntimePlan(
            agent_name=definition.name,
            agent_type=definition.agent_type,
            resolved_system_prompt="\n".join(text_parts).strip(),
            resolved_capabilities=constrained,
            resolved_limits=merged_limits,
            execution_transport=transport,
            loop_mode=loop_mode,
        )

    async def _resolve_skill_bodies(self, skill_names: List[str]) -> List[str]:
        if not skill_names:
            return []
        skills = await skill_service.list_skills(enabled_only=True)
        by_name = {str(s.get("name") or ""): s for s in skills}
        out: List[str] = []
        for name in skill_names:
            row = by_name.get(name)
            if not row:
                continue
            body = str(row.get("body") or "").strip()
            if body:
                out.append(f"#### {name}\n{body}")
        return out

    def _apply_mcp_whitelist(self, selected: CapabilityRegistry, mcp_servers: List[str]) -> CapabilityRegistry:
        out = CapabilityRegistry()
        allow_servers = [x for x in mcp_servers if x]
        for cap in selected.list_all():
            if cap.name != "call_mcp_tool":
                out.register(cap)
                continue
            if not allow_servers:
                continue
            out.register(RestrictedCallMcpTool(cap, allow_servers))
        return out

    @staticmethod
    def _resolve_limits(*, definition: AgentDefinition, overrides: Dict[str, Any]) -> LoopLimits:
        d = definition.limits

        def _clamp(v: Any, default: int | None) -> int | None:
            if v is None:
                return default
            try:
                iv = int(v)
            except Exception:
                return default
            if iv <= 0:
                return default
            if default is None:
                return iv
            return min(iv, default)

        return LoopLimits(
            max_rounds=_clamp(overrides.get("max_rounds"), d.max_rounds),
            max_tool_phases=_clamp(overrides.get("max_tool_phases"), d.max_tool_phases),
            timeout_seconds=_clamp(overrides.get("timeout_seconds"), d.timeout_seconds),
        )
