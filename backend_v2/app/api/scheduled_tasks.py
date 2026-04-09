from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import scheduled_task_service

"""
# 定时任务 API

管理周期性执行的任务。

## 主要功能
- 列出定时任务
- 创建/更新定时任务
- 启用/禁用任务
- 手动触发待执行任务

## 配置参数
- `interval_seconds`: 执行间隔（秒）
- `scheduler_mode`: 调度模式
- `task_tag`: 任务标签
"""
router = APIRouter(prefix="/api/scheduled-tasks", tags=["定时任务"])


class ScheduledTaskUpsertRequest(BaseModel):
    name: str
    agent_name: str
    prompt: str
    interval_seconds: int
    scheduler_mode: str = "direct"
    task_tag: str = ""
    enabled: bool = True


@router.get("")
async def list_scheduled_tasks(enabled_only: bool = Query(default=False)) -> Dict[str, Any]:
    rows = await scheduled_task_service.list_scheduled_tasks(enabled_only=enabled_only)
    return {"count": len(rows), "tasks": rows}


@router.post("")
async def upsert_scheduled_task(body: ScheduledTaskUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    agent_name = body.agent_name.strip()
    prompt = body.prompt.strip()
    if not name or not agent_name or not prompt:
        raise HTTPException(status_code=400, detail="name, agent_name and prompt are required")
    if body.interval_seconds <= 0:
        raise HTTPException(status_code=400, detail="interval_seconds must be > 0")
    await scheduled_task_service.upsert_scheduled_task(
        name=name,
        agent_name=agent_name,
        prompt=prompt,
        interval_seconds=body.interval_seconds,
        scheduler_mode=body.scheduler_mode.strip() or "direct",
        task_tag=body.task_tag.strip(),
        enabled=body.enabled,
    )
    return {"ok": True, "name": name}


@router.delete("/{name}")
async def delete_scheduled_task(name: str) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    deleted = await scheduled_task_service.delete_scheduled_task(target)
    return {"ok": True, "deleted": deleted}


class ScheduledTaskToggleRequest(BaseModel):
    enabled: bool


@router.post("/{name}/enabled")
async def set_scheduled_task_enabled(name: str, body: ScheduledTaskToggleRequest) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    updated = await scheduled_task_service.set_scheduled_task_enabled(target, body.enabled)
    return {"ok": True, "updated": updated, "enabled": body.enabled}


@router.post("/run-due")
async def run_due_scheduled_tasks(limit: Optional[int] = Query(default=5, ge=1, le=20)) -> Dict[str, Any]:
    return await scheduled_task_service.run_due_scheduled_tasks(limit=limit or 5)
