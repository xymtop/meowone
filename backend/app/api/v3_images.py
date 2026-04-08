from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import agent_image_service

router = APIRouter(prefix="/api/v3", tags=["v3_images"])


# ============================================================
# Agent Image API (智能体镜像)
# ============================================================

class AgentImageCreate(BaseModel):
    name: str
    description: str = ""
    agent_ids: Optional[List[str]] = None  # 选中的智能体ID列表
    loop_id: Optional[str] = None
    strategy_id: Optional[str] = None
    strategy_config: Optional[Dict[str, Any]] = None
    environment_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentImageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    agent_ids: Optional[List[str]] = None
    loop_id: Optional[Optional[str]] = None
    strategy_id: Optional[Optional[str]] = None
    strategy_config: Optional[Dict[str, Any]] = None
    environment_id: Optional[Optional[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


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
    image = await agent_image_service.update_agent_image(
        image_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        agent_ids=body.agent_ids,
        loop_id=body.loop_id,
        strategy_id=body.strategy_id,
        strategy_config=body.strategy_config,
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
# Agent Instance API (智能体实例)
# ============================================================

class AgentInstanceCreate(BaseModel):
    name: str
    description: str = ""
    image_id: str
    model_name: str = ""
    runtime_config: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentInstanceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_id: Optional[str] = None
    model_name: Optional[str] = None
    runtime_config: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


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
