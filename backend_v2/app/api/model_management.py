from __future__ import annotations

import json
from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config_loaders import invalidate_config_cache
from app.services.services.model_service import (
    delete_model,
    list_models,
    set_default_model,
    upsert_model,
)

"""
# 模型管理 API

管理 LLM 模型配置，支持多模型切换。

## 主要功能
- 列出所有模型
- 添加/更新模型
- 设置默认模型
- 删除模型

## 模型提供者
支持 OpenAI 兼容格式，包括：
- OpenAI
- Azure OpenAI
- Anthropic
- 本地部署模型
- 自定义兼容 API
"""
router = APIRouter(prefix="/api/models", tags=["模型管理"])


class ModelUpsertRequest(BaseModel):
    name: str
    provider: str = "openai-compatible"
    base_url: str
    api_key: str = ""
    enabled: bool = True
    is_default: bool = False
    extra: Dict[str, Any] = {}


@router.get("")
async def list_llm_models() -> Dict[str, Any]:
    items = await list_models(enabled_only=False)
    return {"count": len(items), "models": items}


@router.post("")
async def upsert_llm_model(body: ModelUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    base_url = body.base_url.strip()
    if not name or not base_url:
        raise HTTPException(status_code=400, detail="name and base_url are required")
    await upsert_model(
        name=name,
        provider=body.provider.strip() or "openai-compatible",
        base_url=base_url,
        api_key=body.api_key.strip(),
        enabled=body.enabled,
        is_default=body.is_default,
        extra_json=json.dumps(body.extra, ensure_ascii=False),
    )
    invalidate_config_cache()
    return {"ok": True, "name": name}


@router.post("/{name}/default")
async def set_default(name: str) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    ok = await set_default_model(target)
    if not ok:
        raise HTTPException(status_code=404, detail="enabled model not found")
    invalidate_config_cache()
    return {"ok": True, "name": target}


@router.delete("/{name}")
async def remove_model(name: str) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    deleted = await delete_model(target)
    invalidate_config_cache()
    return {"ok": True, "deleted": deleted}
