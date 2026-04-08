from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import v3_service

router = APIRouter(prefix="/api/v3", tags=["v3"])


# ============================================================
# Organization API
# ============================================================

class OrganizationCreate(BaseModel):
    name: str
    description: str = ""
    parent_org_id: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parent_org_id: Optional[Optional[str]] = None
    settings: Optional[Dict[str, Any]] = None


@router.post("/orgs", response_model=Dict[str, Any])
async def create_organization(body: OrganizationCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    org = await v3_service.create_organization(
        name=body.name.strip(),
        description=body.description.strip(),
        parent_org_id=body.parent_org_id,
        settings=body.settings,
    )
    return {"ok": True, "organization": org}


@router.get("/orgs", response_model=Dict[str, Any])
async def list_organizations(parent_org_id: Optional[str] = Query(default=None)):
    items = await v3_service.list_organizations(parent_org_id=parent_org_id or None)
    return {"count": len(items), "organizations": items}


@router.get("/orgs/{org_id}", response_model=Dict[str, Any])
async def get_organization(org_id: str):
    org = await v3_service.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.put("/orgs/{org_id}", response_model=Dict[str, Any])
async def update_organization(org_id: str, body: OrganizationUpdate):
    org = await v3_service.update_organization(
        org_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        parent_org_id=body.parent_org_id,
        settings=body.settings,
    )
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"ok": True, "organization": org}


@router.delete("/orgs/{org_id}", response_model=Dict[str, Any])
async def delete_organization(org_id: str):
    deleted = await v3_service.delete_organization(org_id)
    return {"ok": True, "deleted": deleted}


@router.post("/orgs/{org_id}/agents", response_model=Dict[str, Any])
async def add_org_agent(org_id: str, body: Dict[str, Any]):
    org = await v3_service.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    from app.services import agent_service
    agent = await agent_service.get_agent_by_id(body.get("agent_id", ""))
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    # 更新 agents 表的 org_id
    async with v3_service.get_db() as db:
        await db.execute(
            "UPDATE agents SET org_id = ? WHERE id = ?",
            (org_id, body["agent_id"]),
        )
        await db.commit()
    return {"ok": True}


# ============================================================
# Team API
# ============================================================

class TeamCreate(BaseModel):
    name: str
    org_id: str
    description: str = ""
    parent_team_id: Optional[str] = None
    leader_agent_id: Optional[str] = None
    default_strategy: str = "direct"
    strategy_config: Optional[Dict[str, Any]] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    leader_agent_id: Optional[Optional[str]] = None
    default_strategy: Optional[str] = None
    strategy_config: Optional[Dict[str, Any]] = None


class TeamMemberRequest(BaseModel):
    agent_id: str
    role: str = "member"


@router.post("/teams", response_model=Dict[str, Any])
async def create_team(body: TeamCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.org_id:
        raise HTTPException(status_code=400, detail="org_id is required")
    team = await v3_service.create_team(
        name=body.name.strip(),
        org_id=body.org_id,
        description=body.description.strip(),
        parent_team_id=body.parent_team_id,
        leader_agent_id=body.leader_agent_id,
        default_strategy=body.default_strategy.strip() or "direct",
        strategy_config=body.strategy_config,
    )
    return {"ok": True, "team": team}


@router.get("/teams", response_model=Dict[str, Any])
async def list_teams(org_id: Optional[str] = Query(default=None)):
    items = await v3_service.list_teams(org_id=org_id or None)
    return {"count": len(items), "teams": items}


@router.get("/teams/{team_id}", response_model=Dict[str, Any])
async def get_team(team_id: str):
    team = await v3_service.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.put("/teams/{team_id}", response_model=Dict[str, Any])
async def update_team(team_id: str, body: TeamUpdate):
    team = await v3_service.update_team(
        team_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        leader_agent_id=body.leader_agent_id,
        default_strategy=body.default_strategy.strip() if body.default_strategy else None,
        strategy_config=body.strategy_config,
    )
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"ok": True, "team": team}


@router.delete("/teams/{team_id}", response_model=Dict[str, Any])
async def delete_team(team_id: str):
    deleted = await v3_service.delete_team(team_id)
    return {"ok": True, "deleted": deleted}


@router.post("/teams/{team_id}/members", response_model=Dict[str, Any])
async def add_team_member(team_id: str, body: TeamMemberRequest):
    team = await v3_service.get_team_by_id(team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    await v3_service.add_team_member(team_id, body.agent_id, body.role)
    return {"ok": True}


@router.delete("/teams/{team_id}/members/{agent_id}", response_model=Dict[str, Any])
async def remove_team_member(team_id: str, agent_id: str):
    removed = await v3_service.remove_team_member(team_id, agent_id)
    return {"ok": True, "removed": removed}


# ============================================================
# Loop API
# ============================================================

class LoopCreate(BaseModel):
    name: str
    description: str = ""
    module_path: str
    config_schema: Optional[Dict[str, Any]] = None
    is_system: bool = False


class LoopUpdate(BaseModel):
    description: Optional[str] = None
    config_schema: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


@router.post("/loops", response_model=Dict[str, Any])
async def create_loop(body: LoopCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.module_path.strip():
        raise HTTPException(status_code=400, detail="module_path is required")
    loop = await v3_service.create_loop(
        name=body.name.strip(),
        description=body.description.strip(),
        module_path=body.module_path.strip(),
        config_schema=body.config_schema,
        is_system=body.is_system,
    )
    return {"ok": True, "loop": loop}


@router.get("/loops", response_model=Dict[str, Any])
async def list_loops(enabled: Optional[bool] = Query(default=None)):
    items = await v3_service.list_loops(enabled=enabled)
    return {"count": len(items), "loops": items}


@router.get("/loops/{loop_id}", response_model=Dict[str, Any])
async def get_loop(loop_id: str):
    loop = await v3_service.get_loop_by_id(loop_id)
    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")
    return loop


@router.put("/loops/{loop_id}", response_model=Dict[str, Any])
async def update_loop(loop_id: str, body: LoopUpdate):
    loop = await v3_service.update_loop(
        loop_id,
        description=body.description if body.description is not None else None,
        config_schema=body.config_schema,
        enabled=body.enabled,
    )
    if not loop:
        raise HTTPException(status_code=404, detail="Loop not found")
    return {"ok": True, "loop": loop}


@router.delete("/loops/{loop_id}", response_model=Dict[str, Any])
async def delete_loop(loop_id: str):
    loop = await v3_service.get_loop_by_id(loop_id)
    if loop and loop.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system loop")
    deleted = await v3_service.delete_loop(loop_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Strategy API
# ============================================================

class StrategyCreate(BaseModel):
    name: str
    description: str = ""
    module_path: str
    config_schema: Optional[Dict[str, Any]] = None
    is_system: bool = False


class StrategyUpdate(BaseModel):
    description: Optional[str] = None
    config_schema: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


@router.post("/strategies", response_model=Dict[str, Any])
async def create_strategy(body: StrategyCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.module_path.strip():
        raise HTTPException(status_code=400, detail="module_path is required")
    strategy = await v3_service.create_strategy(
        name=body.name.strip(),
        description=body.description.strip(),
        module_path=body.module_path.strip(),
        config_schema=body.config_schema,
        is_system=body.is_system,
    )
    return {"ok": True, "strategy": strategy}


@router.get("/strategies", response_model=Dict[str, Any])
async def list_strategies(enabled: Optional[bool] = Query(default=None)):
    items = await v3_service.list_strategies(enabled=enabled)
    return {"count": len(items), "strategies": items}


@router.get("/strategies/{strategy_id}", response_model=Dict[str, Any])
async def get_strategy(strategy_id: str):
    strategy = await v3_service.get_strategy_by_id(strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.put("/strategies/{strategy_id}", response_model=Dict[str, Any])
async def update_strategy(strategy_id: str, body: StrategyUpdate):
    strategy = await v3_service.update_strategy(
        strategy_id,
        description=body.description if body.description is not None else None,
        config_schema=body.config_schema,
        enabled=body.enabled,
    )
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"ok": True, "strategy": strategy}


@router.delete("/strategies/{strategy_id}", response_model=Dict[str, Any])
async def delete_strategy(strategy_id: str):
    strategy = await v3_service.get_strategy_by_id(strategy_id)
    if strategy and strategy.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system strategy")
    deleted = await v3_service.delete_strategy(strategy_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Environment API
# ============================================================

class EnvironmentCreate(BaseModel):
    name: str
    description: str = ""
    sandbox_type: str = "native"
    sandbox_config: Optional[Dict[str, Any]] = None
    resource_limits: Optional[Dict[str, Any]] = None
    allowed_tools: Optional[List[str]] = None
    denied_tools: Optional[List[str]] = None
    max_rounds: int = 10
    timeout_seconds: int = 300


class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sandbox_type: Optional[str] = None
    sandbox_config: Optional[Dict[str, Any]] = None
    resource_limits: Optional[Dict[str, Any]] = None
    allowed_tools: Optional[List[str]] = None
    denied_tools: Optional[List[str]] = None
    max_rounds: Optional[int] = None
    timeout_seconds: Optional[int] = None
    enabled: Optional[bool] = None


@router.post("/environments", response_model=Dict[str, Any])
async def create_environment(body: EnvironmentCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    env = await v3_service.create_environment(
        name=body.name.strip(),
        description=body.description.strip(),
        sandbox_type=body.sandbox_type.strip() or "native",
        sandbox_config=body.sandbox_config,
        resource_limits=body.resource_limits,
        allowed_tools=body.allowed_tools,
        denied_tools=body.denied_tools,
        max_rounds=body.max_rounds,
        timeout_seconds=body.timeout_seconds,
    )
    return {"ok": True, "environment": env}


@router.get("/environments", response_model=Dict[str, Any])
async def list_environments(enabled: Optional[bool] = Query(default=None)):
    items = await v3_service.list_environments(enabled=enabled)
    return {"count": len(items), "environments": items}


@router.get("/environments/{env_id}", response_model=Dict[str, Any])
async def get_environment(env_id: str):
    env = await v3_service.get_environment_by_id(env_id)
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return env


@router.put("/environments/{env_id}", response_model=Dict[str, Any])
async def update_environment(env_id: str, body: EnvironmentUpdate):
    env = await v3_service.update_environment(
        env_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        sandbox_type=body.sandbox_type.strip() if body.sandbox_type else None,
        sandbox_config=body.sandbox_config,
        resource_limits=body.resource_limits,
        allowed_tools=body.allowed_tools,
        denied_tools=body.denied_tools,
        max_rounds=body.max_rounds,
        timeout_seconds=body.timeout_seconds,
        enabled=body.enabled,
    )
    if not env:
        raise HTTPException(status_code=404, detail="Environment not found")
    return {"ok": True, "environment": env}


@router.delete("/environments/{env_id}", response_model=Dict[str, Any])
async def delete_environment(env_id: str):
    deleted = await v3_service.delete_environment(env_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Dispatch API (基础实现)
# ============================================================

class DispatchRequest(BaseModel):
    task: str
    target: Optional[Dict[str, Any]] = None
    strategy: str = "direct"
    strategy_config: Optional[Dict[str, Any]] = None
    environment_id: Optional[str] = None
    loop: Optional[Dict[str, Any]] = None
    timeout_seconds: int = 300


@router.post("/dispatch", response_model=Dict[str, Any])
async def dispatch_task(body: DispatchRequest):
    import uuid
    from fastapi import BackgroundTasks

    execution_id = str(uuid.uuid4())
    # TODO: Phase 2 实现真正的调度逻辑
    return {
        "ok": True,
        "execution_id": execution_id,
        "status": "pending",
        "message": "Dispatch endpoint ready. Full orchestration will be implemented in Phase 2.",
    }


@router.get("/dispatch/{execution_id}", response_model=Dict[str, Any])
async def get_dispatch_status(execution_id: str):
    return {
        "execution_id": execution_id,
        "status": "pending",
        "message": "Status endpoint ready.",
    }
