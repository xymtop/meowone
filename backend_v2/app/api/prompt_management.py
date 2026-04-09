from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import prompt_service

"""
# 提示词管理 API

管理 Agent 系统提示词模板。

## 主要功能
- 列出所有提示词
- 获取提示词详情
- 创建/更新提示词
- 启用/禁用提示词
- 删除提示词

## 提示词用途
- 系统提示词模板
- Agent 角色定义
- 任务指令模板
"""
router = APIRouter(prefix="/api/prompts", tags=["提示词管理"])


class PromptUpsertRequest(BaseModel):
    prompt_key: str
    name: str
    content_md: str
    description: str = ""
    tags: List[str] = []
    enabled: bool = True


class PromptToggleRequest(BaseModel):
    enabled: bool


@router.get("")
async def list_prompts(enabled_only: bool = Query(default=False)) -> Dict[str, Any]:
    items = await prompt_service.list_prompts(enabled_only=enabled_only)
    return {"count": len(items), "prompts": items}


@router.get("/{prompt_key}")
async def get_prompt(prompt_key: str) -> Dict[str, Any]:
    key = prompt_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="prompt_key is required")
    item = await prompt_service.get_prompt(key)
    if not item:
        raise HTTPException(status_code=404, detail="prompt not found")
    return item


@router.post("")
async def upsert_prompt(body: PromptUpsertRequest) -> Dict[str, Any]:
    key = body.prompt_key.strip()
    name = body.name.strip()
    content_md = body.content_md
    if not key or not name:
        raise HTTPException(status_code=400, detail="prompt_key and name are required")
    if not content_md.strip():
        raise HTTPException(status_code=400, detail="content_md is required")
    await prompt_service.upsert_prompt(
        prompt_key=key,
        name=name,
        content_md=content_md,
        description=body.description.strip(),
        tags=body.tags,
        enabled=body.enabled,
    )
    return {"ok": True, "prompt_key": key}


@router.post("/{prompt_key}/enabled")
async def set_prompt_enabled(prompt_key: str, body: PromptToggleRequest) -> Dict[str, Any]:
    key = prompt_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="prompt_key is required")
    updated = await prompt_service.set_prompt_enabled(key, body.enabled)
    return {"ok": True, "updated": updated, "enabled": body.enabled}


@router.delete("/{prompt_key}")
async def delete_prompt(prompt_key: str) -> Dict[str, Any]:
    key = prompt_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="prompt_key is required")
    deleted = await prompt_service.delete_prompt(key)
    return {"ok": True, "deleted": deleted}
