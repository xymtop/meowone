from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List

from app.agents.definition import AgentDefinition
from app.agents.dispatcher import agent_dispatcher
from app.agents.plan_builder import AgentPlanBuilder
from app.services import agent_service


@dataclass
class InternalAgentSpec:
    name: str
    description: str = ""
    system_prompt: str = ""
    mcp_servers: List[str] = field(default_factory=list)
    agent_skills: List[str] = field(default_factory=list)
    allow_tools: List[str] = field(default_factory=list)
    deny_tools: List[str] = field(default_factory=list)
    max_rounds: int | None = None
    max_tool_phases: int | None = None
    timeout_seconds: int | None = None
    prompt_key: str = ""
    loop_mode: str = "react"

    def to_public_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data["tools_policy"] = {
            "allow": self.allow_tools,
            "deny": self.deny_tools,
        }
        return data


class InternalAgentFactory:
    def __init__(self) -> None:
        self._plan_builder = AgentPlanBuilder()

    async def create(self, spec: InternalAgentSpec) -> InternalAgentSpec:
        await agent_service.upsert_internal_agent(
            name=spec.name,
            description=spec.description,
            system_prompt=spec.system_prompt,
            mcp_servers=spec.mcp_servers,
            agent_skills=spec.agent_skills,
            allow_tools=spec.allow_tools,
            deny_tools=spec.deny_tools,
            max_rounds=spec.max_rounds,
            max_tool_phases=spec.max_tool_phases,
            timeout_seconds=spec.timeout_seconds,
            prompt_key=spec.prompt_key,
            loop_mode=spec.loop_mode,
        )
        return spec

    async def list(self) -> List[InternalAgentSpec]:
        rows = await agent_service.list_agents(agent_type="internal")
        return [self._to_spec(row) for row in rows]

    async def get(self, name: str) -> InternalAgentSpec | None:
        row = await agent_service.get_agent(name=name, agent_type="internal")
        return self._to_spec(row) if row else None

    @staticmethod
    def _to_spec(data: Dict[str, Any]) -> InternalAgentSpec:
        metadata = data.get("metadata_json") or {}
        if isinstance(metadata, str) and metadata:
            metadata = json.loads(metadata)
        return InternalAgentSpec(
            name=str(data.get("name") or ""),
            description=str(data.get("description") or ""),
            system_prompt=str(data.get("system_prompt") or ""),
            mcp_servers=[str(x) for x in (data.get("mcp_servers") or [])],
            agent_skills=[str(x) for x in (data.get("agent_skills") or [])],
            allow_tools=[str(x) for x in (data.get("allow_tools") or [])],
            deny_tools=[str(x) for x in (data.get("deny_tools") or [])],
            max_rounds=data.get("max_rounds"),
            max_tool_phases=data.get("max_tool_phases"),
            timeout_seconds=data.get("timeout_seconds"),
            prompt_key=str(data.get("prompt_key") or ""),
            loop_mode=str(metadata.get("loop_mode") or "react").strip() or "react",
        )

    async def invoke(self, *, name: str, task: str, history: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
        spec = await self.get(name)
        if spec is None:
            return {"ok": False, "error": f"Unknown internal agent: {name}"}
        row = await agent_service.get_agent(name=spec.name, agent_type="internal")
        if row is None:
            return {"ok": False, "error": f"Unknown internal agent: {name}"}
        definition = AgentDefinition.from_row(row)
        plan = await self._plan_builder.build(definition, channel_id="internal_agent")
        return await agent_dispatcher.invoke(plan=plan, task=task, history=history or [])


internal_agent_factory = InternalAgentFactory()
