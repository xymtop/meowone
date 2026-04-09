from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import agent_image_service

"""
# v3 智能体镜像 API

Agent Image（智能体镜像）和 Agent Instance（智能体实例）管理。

## 概念说明

### Agent Image (智能体镜像)
预配置的智能体组合，包含：
- 智能体列表
- Loop 模式
- 调度策略
- 执行环境

### Agent Instance (智能体实例)
Image 的运行时实例，可启动/停止。

## 主要功能
- 创建/更新/删除 Agent Image
- 创建/更新/删除 Agent Instance
- 启动/停止 Instance
"""
router = APIRouter(prefix="/api/v3", tags=["v3智能体镜像"])


# ============================================================
# Agent Image API (智能体镜像)
# ============================================================

class AgentImageCreate(BaseModel):
    """创建智能体镜像请求"""
    name: str = Field(..., description="镜像名称")
    description: str = Field(default="", description="镜像描述")
    agent_ids: Optional[List[str]] = Field(default=None, description="选中的智能体ID列表")
    loop_id: Optional[str] = Field(default=None, description="循环模式ID")
    strategy_id: Optional[str] = Field(default=None, description="调度策略ID")
    environment_id: Optional[str] = Field(default=None, description="环境ID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class AgentImageUpdate(BaseModel):
    """更新智能体镜像请求"""
    name: Optional[str] = Field(default=None, description="镜像名称")
    description: Optional[str] = Field(default=None, description="镜像描述")
    agent_ids: Optional[List[str]] = Field(default=None, description="选中的智能体ID列表")
    loop_id: Optional[Optional[str]] = Field(default=None, description="循环模式ID")
    strategy_id: Optional[Optional[str]] = Field(default=None, description="调度策略ID")
    environment_id: Optional[Optional[str]] = Field(default=None, description="环境ID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


@router.post("/images", response_model=Dict[str, Any])
async def create_agent_image(body: AgentImageCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    image = await agent_image_service.create_agent_image(
        name=body.name.strip(),
        description=body.description.strip(),
        agent_ids=body.agent_ids,
        loop_id=body.loop_id,
        strategy_id=body.strategy_id,
        environment_id=body.environment_id,
        metadata=body.metadata,
    )
    return {"ok": True, "image": image}


@router.get("/images", response_model=Dict[str, Any])
async def list_agent_images(enabled: Optional[bool] = Query(default=None)):
    items = await agent_image_service.list_agent_images(enabled=enabled)
    return {"count": len(items), "images": items}


@router.get("/images/{image_id}", response_model=Dict[str, Any])
async def get_agent_image(image_id: str):
    image = await agent_image_service.get_agent_image_by_id(image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return image


@router.put("/images/{image_id}", response_model=Dict[str, Any])
async def update_agent_image(image_id: str, body: AgentImageUpdate):
    image = await agent_image_service.update_agent_image(
        image_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        agent_ids=body.agent_ids,
        loop_id=body.loop_id,
        strategy_id=body.strategy_id,
        environment_id=body.environment_id,
        metadata=body.metadata,
        enabled=body.enabled,
    )
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"ok": True, "image": image}


@router.delete("/images/{image_id}", response_model=Dict[str, Any])
async def delete_agent_image(image_id: str):
    deleted = await agent_image_service.delete_agent_image(image_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Image Strategy Configs API (镜像的策略配置)
# ============================================================

@router.get("/images/{image_id}/strategy-configs", response_model=Dict[str, Any])
async def list_image_strategy_configs(image_id: str):
    """获取指定镜像的所有策略配置"""
    from app.services import v3_service
    configs = await v3_service.list_strategy_configs(image_id=image_id)
    return {"count": len(configs), "configs": configs}


# ============================================================
# Agent Instance API (智能体实例)
# ============================================================

class AgentInstanceCreate(BaseModel):
    """创建智能体实例请求"""
    name: str = Field(..., description="实例名称")
    description: str = Field(default="", description="实例描述")
    image_id: str = Field(..., description="所属镜像ID")
    model_name: str = Field(default="", description="模型名称")
    strategy_config_id: Optional[str] = Field(default=None, description="策略配置ID（从镜像的配置中选择）")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="自定义策略配置（可选）")
    runtime_config: Optional[Dict[str, Any]] = Field(default=None, description="运行时配置")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class AgentInstanceUpdate(BaseModel):
    """更新智能体实例请求"""
    name: Optional[str] = Field(default=None, description="实例名称")
    description: Optional[str] = Field(default=None, description="实例描述")
    image_id: Optional[str] = Field(default=None, description="所属镜像ID")
    model_name: Optional[str] = Field(default=None, description="模型名称")
    strategy_config_id: Optional[Optional[str]] = Field(default=None, description="策略配置ID")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="自定义策略配置")
    runtime_config: Optional[Dict[str, Any]] = Field(default=None, description="运行时配置")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


@router.post("/instances", response_model=Dict[str, Any])
async def create_agent_instance(body: AgentInstanceCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.image_id:
        raise HTTPException(status_code=400, detail="image_id is required")
    image = await agent_image_service.get_agent_image_by_id(body.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    instance = await agent_image_service.create_agent_instance(
        name=body.name.strip(),
        description=body.description.strip(),
        image_id=body.image_id,
        model_name=body.model_name.strip(),
        strategy_config_id=body.strategy_config_id,
        strategy_config=body.strategy_config,
        runtime_config=body.runtime_config,
        metadata=body.metadata,
    )
    return {"ok": True, "instance": instance}


@router.get("/instances", response_model=Dict[str, Any])
async def list_agent_instances(enabled: Optional[bool] = Query(default=None)):
    items = await agent_image_service.list_agent_instances(enabled=enabled)
    return {"count": len(items), "instances": items}


@router.get("/instances/{instance_id}", response_model=Dict[str, Any])
async def get_agent_instance(instance_id: str):
    instance = await agent_image_service.get_agent_instance_by_id(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return instance


@router.put("/instances/{instance_id}", response_model=Dict[str, Any])
async def update_agent_instance(instance_id: str, body: AgentInstanceUpdate):
    instance = await agent_image_service.update_agent_instance(
        instance_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        image_id=body.image_id,
        model_name=body.model_name.strip() if body.model_name is not None else None,
        strategy_config_id=body.strategy_config_id,
        strategy_config=body.strategy_config,
        runtime_config=body.runtime_config,
        metadata=body.metadata,
        enabled=body.enabled,
    )
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"ok": True, "instance": instance}


@router.delete("/instances/{instance_id}", response_model=Dict[str, Any])
async def delete_agent_instance(instance_id: str):
    deleted = await agent_image_service.delete_agent_instance(instance_id)
    return {"ok": True, "deleted": deleted}


@router.post("/instances/{instance_id}/start", response_model=Dict[str, Any])
async def start_agent_instance(instance_id: str):
    instance = await agent_image_service.start_agent_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"ok": True, "instance": instance}


@router.post("/instances/{instance_id}/stop", response_model=Dict[str, Any])
async def stop_agent_instance(instance_id: str):
    instance = await agent_image_service.stop_agent_instance(instance_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    return {"ok": True, "instance": instance}
