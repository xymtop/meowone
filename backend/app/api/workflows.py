from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.database import get_db

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


class WorkflowNodeCreate(BaseModel):
    id: str
    agent_name: str
    agent_type: str = "internal"
    depends_on: List[str] = []
    input_mapping: Dict[str, str] = {}
    config: Dict[str, Any] = {}


class WorkflowCreateRequest(BaseModel):
    name: str
    description: str = ""
    nodes: List[WorkflowNodeCreate] = []
    strategy: str = "direct"  # direct | pipeline | parallel | dag
    timeout_seconds: int = 300


class WorkflowRunRequest(BaseModel):
    inputs: Dict[str, Any] = {}
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    model_name: Optional[str] = None


async def _get_workflow_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM workflows WHERE name = ? LIMIT 1", (name,)
        )
        row = await cur.fetchone()
    if not row:
        return None
    return dict(row)


async def _get_workflow_by_id(workflow_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM workflows WHERE id = ? LIMIT 1", (workflow_id,)
        )
        row = await cur.fetchone()
    if not row:
        return None
    return dict(row)


@router.get("")
async def list_workflows() -> Dict[str, Any]:
    """列出所有工作流"""
    async with get_db() as db:
        cur = await db.execute(
            "SELECT id, name, description, strategy, node_count, enabled, created_at, updated_at FROM workflows ORDER BY name ASC"
        )
        rows = await cur.fetchall()
    return {"count": len(rows), "workflows": [dict(r) for r in rows]}


@router.post("")
async def create_workflow(body: WorkflowCreateRequest) -> Dict[str, Any]:
    """创建新工作流"""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(status_code=400, detail="invalid workflow name")

    node_ids = [n.id for n in body.nodes]
    if len(node_ids) != len(set(node_ids)):
        raise HTTPException(status_code=400, detail="duplicate node id found")

    for node in body.nodes:
        for dep in node.depends_on:
            if dep not in node_ids:
                raise HTTPException(status_code=400, detail=f"node '{node.id}' depends on unknown node '{dep}'")

    workflow_id = str(uuid.uuid4())
    nodes_json = json.dumps(
        [
            {
                "id": n.id,
                "agent_name": n.agent_name,
                "agent_type": n.agent_type,
                "depends_on": n.depends_on,
                "input_mapping": n.input_mapping,
                "config": n.config,
            }
            for n in body.nodes
        ],
        ensure_ascii=False,
    )

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO workflows (id, name, description, strategy, nodes_json, node_count, enabled, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
            """,
            (workflow_id, name, body.description.strip(), body.strategy, nodes_json, len(body.nodes)),
        )
        await db.commit()

    return {"ok": True, "id": workflow_id, "name": name}


@router.get("/{workflow_id_or_name}")
async def get_workflow(workflow_id_or_name: str) -> Dict[str, Any]:
    """获取工作流详情"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    try:
        wf["nodes"] = json.loads(wf.get("nodes_json", "[]"))
    except Exception:
        wf["nodes"] = []

    return {"found": True, "workflow": wf}


@router.put("/{workflow_id_or_name}")
async def update_workflow(workflow_id_or_name: str, body: WorkflowCreateRequest) -> Dict[str, Any]:
    """更新工作流"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    name = body.name.strip()
    node_ids = [n.id for n in body.nodes]
    if len(node_ids) != len(set(node_ids)):
        raise HTTPException(status_code=400, detail="duplicate node id found")

    for node in body.nodes:
        for dep in node.depends_on:
            if dep not in node_ids:
                raise HTTPException(status_code=400, detail=f"node '{node.id}' depends on unknown node '{dep}'")

    nodes_json = json.dumps(
        [
            {
                "id": n.id,
                "agent_name": n.agent_name,
                "agent_type": n.agent_type,
                "depends_on": n.depends_on,
                "input_mapping": n.input_mapping,
                "config": n.config,
            }
            for n in body.nodes
        ],
        ensure_ascii=False,
    )

    async with get_db() as db:
        await db.execute(
            """
            UPDATE workflows SET name=?, description=?, strategy=?, nodes_json=?, node_count=?, updated_at=datetime('now')
            WHERE id=?
            """,
            (name, body.description.strip(), body.strategy, nodes_json, len(body.nodes), wf["id"]),
        )
        await db.commit()

    return {"ok": True, "id": wf["id"], "name": name}


@router.delete("/{workflow_id_or_name}")
async def delete_workflow(workflow_id_or_name: str) -> Dict[str, Any]:
    """删除工作流"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    async with get_db() as db:
        await db.execute("DELETE FROM workflows WHERE id = ?", (wf["id"],))
        await db.commit()

    return {"ok": True, "deleted": True}


@router.post("/{workflow_id_or_name}/run")
async def run_workflow(workflow_id_or_name: str, body: WorkflowRunRequest) -> Dict[str, Any]:
    """执行工作流"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if not wf.get("enabled", 1):
        raise HTTPException(status_code=400, detail="Workflow is disabled")

    nodes = json.loads(wf.get("nodes_json", "[]"))
    if not nodes:
        raise HTTPException(status_code=400, detail="Workflow has no nodes")

    from app.services.workflow_service import create_workflow_execution

    execution_id = await create_workflow_execution(
        workflow_id=wf["id"],
        workflow_name=wf["name"],
        inputs=body.inputs,
        max_rounds=body.max_rounds,
        max_tool_phases=body.max_tool_phases,
        model_name=body.model_name,
    )

    return {"ok": True, "execution_id": execution_id, "status": "pending"}


@router.get("/{workflow_id_or_name}/runs")
async def list_workflow_runs(workflow_id_or_name: str) -> Dict[str, Any]:
    """列出工作流的执行记录"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT id, status, inputs_json, outputs_json, error_message,
                   started_at, completed_at, duration_ms, node_results_json
            FROM workflow_executions
            WHERE workflow_id = ?
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (wf["id"],),
        )
        rows = await cur.fetchall()

    executions = []
    for r in rows:
        item = dict(r)
        try:
            item["inputs"] = json.loads(item.get("inputs_json", "{}"))
        except Exception:
            item["inputs"] = {}
        try:
            item["outputs"] = json.loads(item.get("outputs_json", "{}"))
        except Exception:
            item["outputs"] = {}
        try:
            item["node_results"] = json.loads(item.get("node_results_json", "[]"))
        except Exception:
            item["node_results"] = []
        executions.append(item)

    return {"count": len(executions), "executions": executions}


@router.post("/{workflow_id_or_name}/enabled")
async def set_workflow_enabled(workflow_id_or_name: str, body: dict) -> Dict[str, Any]:
    """启用/禁用工作流"""
    wf = await _get_workflow_by_id(workflow_id_or_name)
    if not wf:
        wf = await _get_workflow_by_name(workflow_id_or_name)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    enabled = bool(body.get("enabled", True))

    async with get_db() as db:
        await db.execute(
            "UPDATE workflows SET enabled = ?, updated_at = datetime('now') WHERE id = ?",
            (1 if enabled else 0, wf["id"]),
        )
        await db.commit()

    return {"ok": True, "enabled": enabled}