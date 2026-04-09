from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import v3_service

"""
# v3 管理 API

组织、团队、Loop、策略、环境等管理接口。

## 模块说明

### 组织 (Organizations)
企业/团队组织架构管理，支持层级结构。

### 团队 (Teams)
智能体团队管理，配置调度策略。

### Loop (循环)
Agent 执行循环模式，如 react/plan-exec/hierarchical 等。

### 策略 (Strategies)
任务调度策略，如 direct/round-robin/auction 等。

### 环境 (Environments)
执行环境配置，支持沙箱隔离。

### 调度 (Dispatch)
任务调度入口，Phase 2 实现完整功能。
"""
router = APIRouter(prefix="/api/v3", tags=["v3管理"])


# ============================================================
# Organization API
# ============================================================

class OrganizationCreate(BaseModel):
    """创建组织请求"""
    name: str = Field(..., description="组织名称")
    description: str = Field(default="", description="组织描述")
    parent_org_id: Optional[str] = Field(default=None, description="父组织ID（用于层级结构）")
    settings: Optional[Dict[str, Any]] = Field(default=None, description="自定义设置")


class OrganizationUpdate(BaseModel):
    """更新组织请求"""
    name: Optional[str] = Field(default=None, description="组织名称")
    description: Optional[str] = Field(default=None, description="组织描述")
    parent_org_id: Optional[Optional[str]] = Field(default=None, description="父组织ID")
    settings: Optional[Dict[str, Any]] = Field(default=None, description="自定义设置")


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
    """创建团队请求"""
    name: str = Field(..., description="团队名称")
    org_id: str = Field(..., description="所属组织ID")
    description: str = Field(default="", description="团队描述")
    parent_team_id: Optional[str] = Field(default=None, description="父团队ID")
    leader_agent_id: Optional[str] = Field(default=None, description="团队负责人智能体ID")
    default_strategy: str = Field(default="direct", description="默认调度策略")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置")


class TeamUpdate(BaseModel):
    """更新团队请求"""
    name: Optional[str] = Field(default=None, description="团队名称")
    description: Optional[str] = Field(default=None, description="团队描述")
    leader_agent_id: Optional[Optional[str]] = Field(default=None, description="团队负责人智能体ID")
    default_strategy: Optional[str] = Field(default=None, description="默认调度策略")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置")


class TeamMemberRequest(BaseModel):
    """添加团队成员请求"""
    agent_id: str = Field(..., description="智能体ID")
    role: str = Field(default="member", description="成员角色（leader/member）")


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
    """创建循环模式请求"""
    name: str = Field(..., description="循环名称")
    description: str = Field(default="", description="循环描述")
    module_path: str = Field(..., description="模块路径（如 app.loops.react）")
    config_schema: Optional[Dict[str, Any]] = Field(default=None, description="配置Schema")
    is_system: bool = Field(default=False, description="是否系统内置")


class LoopUpdate(BaseModel):
    """更新循环请求"""
    description: Optional[str] = Field(default=None, description="循环描述")
    config_schema: Optional[Dict[str, Any]] = Field(default=None, description="配置Schema")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


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
    """创建策略请求"""
    name: str = Field(..., description="策略名称")
    description: str = Field(default="", description="策略描述")
    module_path: str = Field(..., description="模块路径")
    config_schema: Optional[Dict[str, Any]] = Field(default=None, description="配置Schema")
    is_system: bool = Field(default=False, description="是否系统内置")


class StrategyUpdate(BaseModel):
    """更新策略请求"""
    description: Optional[str] = Field(default=None, description="策略描述")
    config_schema: Optional[Dict[str, Any]] = Field(default=None, description="配置Schema")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


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
# Strategy Config API (策略配置)
# ============================================================

class StrategyConfigCreate(BaseModel):
    """创建策略配置请求"""
    name: str = Field(..., description="策略配置名称")
    description: str = Field(default="", description="策略配置描述")
    image_id: Optional[str] = Field(default=None, description="关联的镜像ID")
    strategy_id: Optional[str] = Field(default=None, description="关联的策略ID（可从镜像继承）")
    config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置参数")


class StrategyConfigUpdate(BaseModel):
    """更新策略配置请求"""
    name: Optional[str] = Field(default=None, description="策略配置名称")
    description: Optional[str] = Field(default=None, description="策略配置描述")
    image_id: Optional[Optional[str]] = Field(default=None, description="关联的镜像ID")
    strategy_id: Optional[Optional[str]] = Field(default=None, description="关联的策略ID")
    config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置参数")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


@router.post("/strategy-configs", response_model=Dict[str, Any])
async def create_strategy_config(body: StrategyConfigCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    cfg = await v3_service.create_strategy_config(
        name=body.name.strip(),
        description=body.description.strip(),
        image_id=body.image_id,
        strategy_id=body.strategy_id,
        config=body.config,
    )
    return {"ok": True, "config": cfg}


@router.get("/strategy-configs", response_model=Dict[str, Any])
async def list_strategy_configs(
    image_id: Optional[str] = Query(default=None, description="按镜像ID筛选"),
    strategy_id: Optional[str] = Query(default=None, description="按策略ID筛选"),
    enabled: Optional[bool] = Query(default=None),
):
    items = await v3_service.list_strategy_configs(
        image_id=image_id, strategy_id=strategy_id, enabled=enabled
    )
    return {"count": len(items), "configs": items}


@router.get("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def get_strategy_config(config_id: str):
    cfg = await v3_service.get_strategy_config_by_id(config_id)
    if not cfg:
        raise HTTPException(status_code=404, detail="Strategy config not found")
    return cfg


@router.put("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def update_strategy_config(config_id: str, body: StrategyConfigUpdate):
    cfg = await v3_service.update_strategy_config(
        config_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        image_id=body.image_id,
        strategy_id=body.strategy_id,
        config=body.config,
        enabled=body.enabled,
    )
    if not cfg:
        raise HTTPException(status_code=404, detail="Strategy config not found")
    return {"ok": True, "config": cfg}


@router.delete("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def delete_strategy_config(config_id: str):
    deleted = await v3_service.delete_strategy_config(config_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Environment API
# ============================================================

class EnvironmentCreate(BaseModel):
    """创建环境请求"""
    name: str = Field(..., description="环境名称")
    description: str = Field(default="", description="环境描述")
    sandbox_type: str = Field(default="native", description="沙箱类型（native/docker/e2b）")
    sandbox_config: Optional[Dict[str, Any]] = Field(default=None, description="沙箱配置")
    resource_limits: Optional[Dict[str, Any]] = Field(default=None, description="资源限制")
    allowed_tools: Optional[List[str]] = Field(default=None, description="允许的工具列表")
    denied_tools: Optional[List[str]] = Field(default=None, description="禁止的工具列表")
    max_rounds: int = Field(default=10, description="最大轮次")
    timeout_seconds: int = Field(default=300, description="超时时间（秒）")
    api_key: str = Field(default="", description="API密钥")


class EnvironmentUpdate(BaseModel):
    """更新环境请求"""
    name: Optional[str] = Field(default=None, description="环境名称")
    description: Optional[str] = Field(default=None, description="环境描述")
    sandbox_type: Optional[str] = Field(default=None, description="沙箱类型")
    sandbox_config: Optional[Dict[str, Any]] = Field(default=None, description="沙箱配置")
    resource_limits: Optional[Dict[str, Any]] = Field(default=None, description="资源限制")
    allowed_tools: Optional[List[str]] = Field(default=None, description="允许的工具列表")
    denied_tools: Optional[List[str]] = Field(default=None, description="禁止的工具列表")
    max_rounds: Optional[int] = Field(default=None, description="最大轮次")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间")
    enabled: Optional[bool] = Field(default=None, description="是否启用")
    api_key: Optional[str] = Field(default=None, description="API密钥")


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
        api_key=body.api_key,
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
        api_key=body.api_key,
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
    """调度任务请求"""
    task: str = Field(..., description="任务描述")
    target: Optional[Dict[str, Any]] = Field(default=None, description="目标配置")
    strategy: str = Field(default="direct", description="调度策略")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置")
    environment_id: Optional[str] = Field(default=None, description="环境ID")
    loop: Optional[Dict[str, Any]] = Field(default=None, description="循环配置")
    timeout_seconds: int = Field(default=300, description="超时时间（秒）")


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
