"""
调度配置 API

管理调度配置文件，支持任意JSON格式，方便后期扩展。

主要功能：
- 创建/更新/删除调度配置
- 获取预设模板
- 配置主从、层级、蜂群等调度拓扑
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import strategy_config_service

router = APIRouter(prefix="/api/v3", tags=["v3调度配置"])


# ============================================================
# Request/Response Models
# ============================================================

class StrategyConfigCreate(BaseModel):
    """创建调度配置请求"""
    name: str = Field(..., description="配置名称")
    description: str = Field(default="", description="配置描述")
    strategy_id: Optional[str] = Field(default=None, description="关联的策略ID")
    config: Optional[Dict[str, Any]] = Field(default=None, description="调度配置内容（JSON）")
    template_type: str = Field(default="custom", description="模板类型")


class StrategyConfigUpdate(BaseModel):
    """更新调度配置请求"""
    name: Optional[str] = Field(default=None, description="配置名称")
    description: Optional[str] = Field(default=None, description="配置描述")
    strategy_id: Optional[Optional[str]] = Field(default=None, description="关联的策略ID")
    config: Optional[Dict[str, Any]] = Field(default=None, description="调度配置内容（JSON）")
    template_type: Optional[str] = Field(default=None, description="模板类型")
    enabled: Optional[bool] = Field(default=None, description="是否启用")


# ============================================================
# API Endpoints
# ============================================================

@router.post("/strategy-configs", response_model=Dict[str, Any])
async def create_strategy_config(body: StrategyConfigCreate):
    """创建调度配置"""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    
    # 检查名称是否已存在
    existing = await strategy_config_service.get_strategy_config_by_name(body.name.strip())
    if existing:
        raise HTTPException(status_code=400, detail=f"Config '{body.name}' already exists")
    
    config = await strategy_config_service.create_strategy_config(
        name=body.name.strip(),
        description=body.description.strip(),
        strategy_id=body.strategy_id,
        config=body.config,
        template_type=body.template_type,
    )
    return {"ok": True, "config": config}


@router.get("/strategy-configs", response_model=Dict[str, Any])
async def list_strategy_configs(
    strategy_id: Optional[str] = Query(default=None, description="按策略ID筛选"),
    enabled: Optional[bool] = Query(default=None, description="按启用状态筛选"),
):
    """列出调度配置"""
    items = await strategy_config_service.list_strategy_configs(
        strategy_id=strategy_id,
        enabled=enabled,
    )
    return {"count": len(items), "configs": items}


@router.get("/strategy-configs/templates", response_model=Dict[str, Any])
async def get_preset_templates():
    """获取预设的调度配置模板"""
    templates = strategy_config_service.get_preset_templates()
    return {"templates": templates}


@router.get("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def get_strategy_config(config_id: str):
    """获取调度配置"""
    config = await strategy_config_service.get_strategy_config_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    return config


@router.put("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def update_strategy_config(config_id: str, body: StrategyConfigUpdate):
    """更新调度配置"""
    # 检查是否存在
    existing = await strategy_config_service.get_strategy_config_by_id(config_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Config not found")
    
    # 检查名称冲突
    if body.name and body.name.strip() != existing.get("name"):
        other = await strategy_config_service.get_strategy_config_by_name(body.name.strip())
        if other and other.get("id") != config_id:
            raise HTTPException(status_code=400, detail=f"Config '{body.name}' already exists")
    
    config = await strategy_config_service.update_strategy_config(
        config_id,
        name=body.name.strip() if body.name else None,
        description=body.description if body.description is not None else None,
        strategy_id=body.strategy_id,
        config=body.config,
        template_type=body.template_type,
        enabled=body.enabled,
    )
    return {"ok": True, "config": config}


@router.delete("/strategy-configs/{config_id}", response_model=Dict[str, Any])
async def delete_strategy_config(config_id: str):
    """删除调度配置"""
    existing = await strategy_config_service.get_strategy_config_by_id(config_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Config not found")
    
    if existing.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system config")
    
    deleted = await strategy_config_service.delete_strategy_config(config_id)
    return {"ok": True, "deleted": deleted}
