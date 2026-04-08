from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import agent_service

router = APIRouter(prefix="/api/agents", tags=["agents"])


class InternalAgentUpsertRequest(BaseModel):
    name: str
    description: str = ""
    system_prompt: str = ""
    mcp_servers: Optional[List[str]] = None
    agent_skills: Optional[List[str]] = None
    allow_tools: Optional[List[str]] = None
    deny_tools: Optional[List[str]] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    prompt_key: str = ""
    model_name: str = ""
    scheduler_mode: str = "direct"


class ExternalAgentUpsertRequest(BaseModel):
    name: str
    description: str = ""
    base_url: str
    protocol: str = "a2a"
    auth_token: Optional[str] = None
    enabled: bool = True


class AgentDiscoverRequest(BaseModel):
    url: str


@router.get("")
async def list_agents(agent_type: Optional[str] = Query(default=None)) -> Dict[str, Any]:
    if agent_type and agent_type not in {"internal", "external"}:
        raise HTTPException(status_code=400, detail="agent_type must be internal or external")
    items = await agent_service.list_agents(agent_type=agent_type)
    return {"count": len(items), "agents": items}


@router.post("/internal")
async def upsert_internal_agent(body: InternalAgentUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    await agent_service.upsert_internal_agent(
        name=name,
        description=body.description.strip(),
        system_prompt=body.system_prompt.strip(),
        mcp_servers=[x for x in (body.mcp_servers or []) if x.strip()],
        agent_skills=[x for x in (body.agent_skills or []) if x.strip()],
        allow_tools=[x for x in (body.allow_tools or []) if x.strip()],
        deny_tools=[x for x in (body.deny_tools or []) if x.strip()],
        max_rounds=body.max_rounds,
        max_tool_phases=body.max_tool_phases,
        timeout_seconds=body.timeout_seconds,
        prompt_key=body.prompt_key.strip(),
        model_name=body.model_name.strip(),
        scheduler_mode=body.scheduler_mode.strip() or "direct",
    )
    return {"ok": True, "name": name, "agent_type": "internal"}


@router.post("/external")
async def upsert_external_agent(body: ExternalAgentUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    base_url = body.base_url.strip()
    protocol = body.protocol.strip() or "a2a"
    if protocol != "a2a":
        raise HTTPException(status_code=400, detail="only a2a protocol is supported for external agents")
    if not name or not base_url:
        raise HTTPException(status_code=400, detail="name and base_url are required")
    await agent_service.upsert_external_agent(
        name=name,
        description=body.description.strip(),
        base_url=base_url,
        protocol=protocol,
        auth_token=body.auth_token,
        enabled=body.enabled,
    )
    return {"ok": True, "name": name, "agent_type": "external"}


@router.delete("/{agent_type}/{name}")
async def delete_agent(agent_type: str, name: str) -> Dict[str, Any]:
    t = agent_type.strip()
    if t not in {"internal", "external"}:
        raise HTTPException(status_code=400, detail="agent_type must be internal or external")
    deleted = await agent_service.delete_agent(name=name.strip(), agent_type=t)
    return {"ok": True, "deleted": deleted}


@router.post("/external/discover")
async def discover_external_agent(body: AgentDiscoverRequest) -> Dict[str, Any]:
    """Discover an A2A agent by fetching its Agent Card."""
    from app.a2a.client import discover_agent_card

    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    card = await discover_agent_card(url)
    if card is None:
        raise HTTPException(
            status_code=404,
            detail="No Agent Card found at the specified URL. Make sure the A2A server is running."
        )

    return {
        "found": True,
        "card": {
            "name": card.name,
            "description": card.description,
            "url": card.url,
            "version": card.version,
            "capabilities": card.capabilities,
            "skills": [
                {"id": s.id, "name": s.name, "description": s.description}
                for s in card.skills
            ],
        },
    }


@router.get("/internal/{name}")
async def get_internal_agent(name: str) -> Dict[str, Any]:
    """获取内部智能体完整配置"""
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    agent = await agent_service.get_agent(name=name, agent_type="internal")
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Internal agent '{name}' not found")
    return agent


@router.get("/external/{name}/card")
async def get_agent_card(name: str) -> Dict[str, Any]:
    """Get the Agent Card for a registered external agent."""
    from app.a2a.client import discover_agent_card

    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    items = await agent_service.list_agents(agent_type="external")
    agent = next((a for a in items if a.get("name") == name), None)

    if agent is None:
        raise HTTPException(status_code=404, detail=f"External agent '{name}' not found")

    base_url = agent.get("base_url", "")
    if not base_url:
        raise HTTPException(status_code=400, detail="Agent has no base_url configured")

    card = await discover_agent_card(base_url)
    if card is None:
        return {
            "found": False,
            "name": agent.get("name"),
            "description": agent.get("description"),
            "url": base_url,
        }

    return {
        "found": True,
        "card": {
            "name": card.name,
            "description": card.description,
            "url": card.url,
            "version": card.version,
            "capabilities": card.capabilities,
            "skills": [
                {"id": s.id, "name": s.name, "description": s.description}
                for s in card.skills
            ],
        },
    }
