from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.database import get_db

"""
# 任务管理 API

管理异步任务的生命周期。

## 任务状态
- `pending`: 等待执行
- `running`: 执行中
- `completed`: 已完成
- `failed`: 失败

## 主要功能
- 创建任务
- 更新任务状态
- 查询任务列表
- 重试失败任务
- 获取任务日志
"""
router = APIRouter(prefix="/api/tasks", tags=["任务管理"])


class TaskCreateRequest(BaseModel):
    name: str
    task_type: str = "agent"
    input_data: Dict[str, Any] = {}
    agent_name: Optional[str] = None
    agent_type: str = "internal"
    parent_task_id: Optional[str] = None
    priority: int = 0
    metadata: Dict[str, Any] = {}


class TaskUpdateRequest(BaseModel):
    status: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


async def _get_task_by_id(task_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM tasks WHERE id = ? LIMIT 1", (task_id,))
        row = await cur.fetchone()
    if not row:
        return None
    return dict(row)


@router.get("")
async def list_tasks(
    status: Optional[str] = Query(default=None),
    task_type: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> Dict[str, Any]:
    """列出任务"""
    conditions = []
    params: List[Any] = []
    if status:
        conditions.append("status = ?")
        params.append(status)
    if task_type:
        conditions.append("task_type = ?")
        params.append(task_type)

    where_sql = " WHERE " + " AND ".join(conditions) if conditions else ""
    count_sql = f"SELECT COUNT(*) FROM tasks{where_sql}"
    select_sql = f"""
        SELECT * FROM tasks{where_sql}
        ORDER BY priority DESC, created_at DESC
        LIMIT ? OFFSET ?
    """

    async with get_db() as db:
        cur = await db.execute(count_sql, tuple(params))
        total = (await cur.fetchone())[0]

        cur = await db.execute(select_sql, tuple(params + [limit, offset]))
        rows = await cur.fetchall()

    items = []
    for row in rows:
        item = dict(row)
        try:
            item["input_data"] = json.loads(item.get("input_json", "{}"))
        except Exception:
            item["input_data"] = {}
        try:
            item["output_data"] = json.loads(item.get("output_json", "{}"))
        except Exception:
            item["output_data"] = {}
        try:
            item["metadata"] = json.loads(item.get("metadata_json", "{}"))
        except Exception:
            item["metadata"] = {}
        items.append(item)

    return {"total": total, "limit": limit, "offset": offset, "tasks": items}


@router.post("")
async def create_task(body: TaskCreateRequest) -> Dict[str, Any]:
    """创建任务"""
    task_id = str(uuid.uuid4())
    input_json = json.dumps(body.input_data, ensure_ascii=False)
    metadata_json = json.dumps(body.metadata, ensure_ascii=False)

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO tasks (id, name, task_type, status, input_json, agent_name, agent_type,
                             parent_task_id, priority, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (
                task_id,
                body.name.strip(),
                body.task_type,
                input_json,
                body.agent_name,
                body.agent_type,
                body.parent_task_id,
                body.priority,
                metadata_json,
            ),
        )
        await db.commit()

    return {"ok": True, "id": task_id, "status": "pending"}


@router.get("/{task_id}")
async def get_task(task_id: str) -> Dict[str, Any]:
    """获取任务详情"""
    task = await _get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        task["input_data"] = json.loads(task.get("input_json", "{}"))
    except Exception:
        task["input_data"] = {}
    try:
        task["output_data"] = json.loads(task.get("output_json", "{}"))
    except Exception:
        task["output_data"] = {}
    try:
        task["metadata"] = json.loads(task.get("metadata_json", "{}"))
    except Exception:
        task["metadata"] = {}

    return {"found": True, "task": task}


@router.patch("/{task_id}")
async def update_task(task_id: str, body: TaskUpdateRequest) -> Dict[str, Any]:
    """更新任务状态/输出"""
    task = await _get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = []
    params: List[Any] = []

    if body.status:
        updates.append("status = ?")
        params.append(body.status)
        if body.status in ("running", "started"):
            updates.append("started_at = COALESCE(started_at, datetime('now'))")

    if body.output_data is not None:
        updates.append("output_json = ?")
        params.append(json.dumps(body.output_data, ensure_ascii=False))

    if body.error_message is not None:
        updates.append("error_message = ?")
        params.append(body.error_message)

    if not updates:
        return {"ok": True, "updated": False, "reason": "no fields to update"}

    updates.append("updated_at = datetime('now')")

    if body.status in ("completed", "failed"):
        updates.append("completed_at = datetime('now')")

    params.append(task_id)
    sql = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"

    async with get_db() as db:
        await db.execute(sql, tuple(params))
        await db.commit()

    return {"ok": True, "updated": True, "task_id": task_id}


@router.delete("/{task_id}")
async def delete_task(task_id: str) -> Dict[str, Any]:
    """删除任务"""
    task = await _get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    async with get_db() as db:
        await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        await db.commit()

    return {"ok": True, "deleted": True}


@router.get("/{task_id}/logs")
async def get_task_logs(task_id: str) -> Dict[str, Any]:
    """获取任务相关的执行日志"""
    task = await _get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT * FROM loop_logs
            WHERE session_id IN (SELECT session_id FROM messages WHERE content LIKE ?)
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (f"%{task_id}%",),
        )
        rows = await cur.fetchall()

    logs = []
    for row in rows:
        item = dict(row)
        try:
            item["input_data"] = json.loads(item.get("input_data", "{}"))
        except Exception:
            pass
        try:
            item["output_data"] = json.loads(item.get("output_data", "{}"))
        except Exception:
            pass
        logs.append(item)

    return {"task_id": task_id, "count": len(logs), "logs": logs}


@router.post("/{task_id}/retry")
async def retry_task(task_id: str) -> Dict[str, Any]:
    """重试失败的任务"""
    task = await _get_task_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.get("status") not in ("failed", "completed"):
        raise HTTPException(status_code=400, detail="Only failed or completed tasks can be retried")

    async with get_db() as db:
        await db.execute(
            """
            UPDATE tasks SET status = 'pending', error_message = NULL,
                           started_at = NULL, completed_at = NULL,
                           updated_at = datetime('now')
            WHERE id = ?
            """,
            (task_id,),
        )
        await db.commit()

    from app.services.task_executor import execute_task_async
    import asyncio
    asyncio.create_task(execute_task_async(task_id))

    return {"ok": True, "task_id": task_id, "status": "pending"}