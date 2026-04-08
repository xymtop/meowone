from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List


SUPPORTED_PROTOCOLS = {"internal_loop", "a2a"}


@dataclass
class AgentToolPolicy:
    allow_tools: List[str] = field(default_factory=list)
    deny_tools: List[str] = field(default_factory=list)


@dataclass
class AgentLimits:
    max_rounds: int | None = None
    max_tool_phases: int | None = None
    timeout_seconds: int | None = None


@dataclass
class AgentEndpoint:
    protocol: str
    base_url: str = ""
    metadata_json: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResources:
    prompt_key: str = ""
    system_prompt_overlay: str = ""
    mcp_servers: List[str] = field(default_factory=list)
    skill_names: List[str] = field(default_factory=list)


@dataclass
class AgentDefinition:
    name: str
    agent_type: str
    description: str = ""
    enabled: bool = True
    resources: AgentResources = field(default_factory=AgentResources)
    tool_policy: AgentToolPolicy = field(default_factory=AgentToolPolicy)
    limits: AgentLimits = field(default_factory=AgentLimits)
    endpoint: AgentEndpoint = field(default_factory=lambda: AgentEndpoint(protocol="internal_loop"))
    loop_mode: str = "react"

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "AgentDefinition":
        agent_type = str(row.get("agent_type") or "internal")
        protocol = str(row.get("protocol") or "").strip()
        if not protocol:
            protocol = "a2a" if agent_type == "external" else "internal_loop"
        metadata = row.get("metadata_json") or {}
        if isinstance(metadata, str) and metadata:
            metadata = json.loads(metadata)
        return cls(
            name=str(row.get("name") or "").strip(),
            agent_type=agent_type,
            description=str(row.get("description") or "").strip(),
            enabled=bool(row.get("enabled", 1)),
            resources=AgentResources(
                prompt_key=str(row.get("prompt_key") or "").strip(),
                system_prompt_overlay=str(row.get("system_prompt") or "").strip(),
                mcp_servers=[str(x) for x in (row.get("mcp_servers") or []) if str(x).strip()],
                skill_names=[str(x) for x in (row.get("agent_skills") or []) if str(x).strip()],
            ),
            tool_policy=AgentToolPolicy(
                allow_tools=[str(x) for x in (row.get("allow_tools") or []) if str(x).strip()],
                deny_tools=[str(x) for x in (row.get("deny_tools") or []) if str(x).strip()],
            ),
            limits=AgentLimits(
                max_rounds=row.get("max_rounds"),
                max_tool_phases=row.get("max_tool_phases"),
                timeout_seconds=row.get("timeout_seconds"),
            ),
            endpoint=AgentEndpoint(
                protocol=protocol,
                base_url=str(row.get("base_url") or "").strip(),
                metadata_json=metadata,
            ),
            loop_mode=str(metadata.get("loop_mode") or "react").strip() or "react",
        )

    def validate(self) -> None:
        if not self.name:
            raise ValueError("agent name is required")
        if self.agent_type not in {"internal", "external"}:
            raise ValueError("agent_type must be internal or external")
        if self.endpoint.protocol not in SUPPORTED_PROTOCOLS:
            raise ValueError(f"unsupported protocol: {self.endpoint.protocol}")
        if self.agent_type == "internal" and self.endpoint.protocol != "internal_loop":
            raise ValueError("internal agent must use protocol internal_loop")
        if self.agent_type == "external":
            if self.endpoint.protocol != "a2a":
                raise ValueError("external agent must use protocol a2a")
            if not self.endpoint.base_url:
                raise ValueError("external a2a agent base_url is required")
        from app.loop.runtime import SUPPORTED_LOOP_MODES
        if self.loop_mode not in SUPPORTED_LOOP_MODES:
            raise ValueError(f"loop_mode must be one of: {', '.join(sorted(SUPPORTED_LOOP_MODES))}")
