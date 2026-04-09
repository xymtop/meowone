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
    strategy_config_id: Optional[str] = Field(default=None, description="调度配置文件ID")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置（JSON）")
    environment_id: Optional[str] = Field(default=None, description="环境ID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class AgentImageUpdate(BaseModel):
    """更新智能体镜像请求"""
    name: Optional[str] = Field(default=None, description="镜像名称")
    description: Optional[str] = Field(default=None, description="镜像描述")
    agent_ids: Optional[List[str]] = Field(default=None, description="选中的智能体ID列表")
    loop_id: Optional[Optional[str]] = Field(default=None, description="循环模式ID")
    strategy_id: Optional[Optional[str]] = Field(default=None, description="调度策略ID")
    strategy_config_id: Optional[Optional[str]] = Field(default=None, description="调度配置文件ID")
    strategy_config: Optional[Dict[str, Any]] = Field(default=None, description="策略配置（JSON）")
    environment_id: Optional[Optional[str]] = Field(default=None, description="环境ID")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


@router.post("/images", response_model=Dict[str, Any])
async def create_agent_image(body: AgentImageCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    
    # 检查名称是否已存在
    existing = await agent_image_service.get_agent_image_by_name(body.name.strip())
    if existing:
        raise HTTPException(status_code=400, detail=f"Image '{body.name}' already exists")
    
    image = await agent_image_service.create_agent_image(
        name=body.name.strip(),
        description=body.description.strip(),
        agent_ids=body.agent_ids,
        loop_id=body.loop_id,
        strategy_id=body.strategy_id,
        strategy_config_id=body.strategy_config_id,
        strategy_config=body.strategy_config,
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
    # 检查是否存在
    existing = await agent_image_service.get_agent_image_by_id(image_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # 检查名称冲突
    if body.name and body.name.strip() != existing.get("name"):
        other = await agent_image_service.get_agent_image_by_name(body.name.strip())
        if other and other.get("id") != image_id:
            raise HTTPException(status_code=400, detail=f"Image '{body.name}' already exists")
    
    image = await agent_image_service.update_agent_image(
        image_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        agent_ids=body.agent_ids,
        loop_id=body.loop_id,
        strategy_id=body.strategy_id,
        strategy_config_id=body.strategy_config_id,
        strategy_config=body.strategy_config,
        environment_id=body.environment_id,
        metadata=body.metadata,
        enabled=body.enabled,
    )
    return {"ok": True, "image": image}


@router.delete("/images/{image_id}", response_model=Dict[str, Any])
async def delete_agent_image(image_id: str):
    deleted = await agent_image_service.delete_agent_image(image_id)
    return {"ok": True, "deleted": deleted}


# ============================================================
# Agent Instance API (智能体实例)
# ============================================================

class AgentInstanceCreate(BaseModel):
    """创建智能体实例请求"""
    name: str = Field(..., description="实例名称")
    description: str = Field(default="", description="实例描述")
    image_id: str = Field(..., description="所属镜像ID")
    environment_id: Optional[str] = Field(default=None, description="执行环境ID（可覆盖镜像配置）")
    model_name: str = Field(default="", description="模型名称（调度时使用）")
    runtime_config: Optional[Dict[str, Any]] = Field(default=None, description="运行时配置")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")


class AgentInstanceUpdate(BaseModel):
    """更新智能体实例请求"""
    name: Optional[str] = Field(default=None, description="实例名称")
    description: Optional[str] = Field(default=None, description="实例描述")
    image_id: Optional[str] = Field(default=None, description="所属镜像ID")
    environment_id: Optional[Optional[str]] = Field(default=None, description="执行环境ID")
    model_name: Optional[str] = Field(default=None, description="模型名称")
    runtime_config: Optional[Dict[str, Any]] = Field(default=None, description="运行时配置")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


@router.post("/instances", response_model=Dict[str, Any])
async def create_agent_instance(body: AgentInstanceCreate):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.image_id:
        raise HTTPException(status_code=400, detail="image_id is required")
    
    # 检查镜像是否存在
    image = await agent_image_service.get_agent_image_by_id(body.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # 检查名称是否已存在
    existing = await agent_image_service.get_agent_instance_by_name(body.name.strip())
    if existing:
        raise HTTPException(status_code=400, detail=f"Instance '{body.name}' already exists")
    
    instance = await agent_image_service.create_agent_instance(
        name=body.name.strip(),
        description=body.description.strip(),
        image_id=body.image_id,
        environment_id=body.environment_id,
        model_name=body.model_name.strip(),
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
    # 检查是否存在
    existing = await agent_image_service.get_agent_instance_by_id(instance_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Instance not found")
    
    # 检查名称冲突
    if body.name and body.name.strip() != existing.get("name"):
        other = await agent_image_service.get_agent_instance_by_name(body.name.strip())
        if other and other.get("id") != instance_id:
            raise HTTPException(status_code=400, detail=f"Instance '{body.name}' already exists")
    
    # 检查镜像是否存在（如果更改了镜像）
    if body.image_id:
        image = await agent_image_service.get_agent_image_by_id(body.image_id)
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
    
    instance = await agent_image_service.update_agent_instance(
        instance_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        image_id=body.image_id,
        environment_id=body.environment_id,
        model_name=body.model_name.strip() if body.model_name is not None else None,
        runtime_config=body.runtime_config,
        metadata=body.metadata,
        enabled=body.enabled,
    )
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
