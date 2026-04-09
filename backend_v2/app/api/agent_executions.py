"""
智能体执行 API

通过统一的 dispatch/caller 层执行智能体任务，
返回标准化执行结果。
"""
from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import agent_service
from app.dispatch.gateway import dispatch

router = APIRouter(prefix="/api/agent-executions", tags=["智能体执行"])


class AgentExecutionRequest(BaseModel):
    agent_name: Optional[str] = None
    agent_id: Optional[str] = None
    task: str
    history: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None


@router.post("")
async def execute_agent(body: AgentExecutionRequest) -> Dict[str, Any]:
    """执行智能体任务（非流式，聚合所有输出后返回）"""
    agent_name = (body.agent_name or "").strip()
    agent_id = (body.agent_id or "").strip()
    task = (body.task or "").strip()

    if not task:
        raise HTTPException(status_code=400, detail="task is required")
    if not agent_name and not agent_id:
        raise HTTPException(status_code=400, detail="agent_name or agent_id is required")

    # 查找智能体
    row = None
    if agent_id:
        row = await agent_service.get_agent_by_id(agent_id)
    if row is None and agent_name:
        row = await agent_service.get_agent(name=agent_name, agent_type="internal")
    if row is None and agent_name:
        row = await agent_service.get_agent(name=agent_name, agent_type="external")
    if row is None:
        raise HTTPException(status_code=404, detail=f"agent not found")

    resolved_id = str(row.get("id") or "")
    execution_id = str(uuid.uuid4())
    start = time.perf_counter()
    loop_rounds = 0

    text_parts: List[str] = []
    error_code = ""
    error_message = ""

    async for event in dispatch(
        user_message=task,
        history=body.history or [],
        agent_id=resolved_id or None,
        agent_name=agent_name or None,
        model=body.model,
    ):
        ev_type = type(event).__name__
        if ev_type == "DeltaEvent":
            if getattr(event, "content", ""):
                text_parts.append(event.content)
        elif ev_type == "DoneEvent":
            loop_rounds = getattr(event, "loop_rounds", 0)
        elif ev_type == "ErrorEvent":
            error_code = getattr(event, "code", "")
            error_message = getattr(event, "message", "")

    output = "".join(text_parts).strip()
    duration_ms = int((time.perf_counter() - start) * 1000)

    if error_code:
        return {
            "ok": False,
            "execution_id": execution_id,
            "agent_name": agent_name,
            "agent_id": resolved_id,
            "output": output,
            "loop_rounds": loop_rounds,
            "duration_ms": duration_ms,
            "error_code": error_code,
            "error": error_message,
        }

    return {
        "ok": True,
        "execution_id": execution_id,
        "agent_name": agent_name,
        "agent_id": resolved_id,
        "output": output,
        "loop_rounds": loop_rounds,
        "duration_ms": duration_ms,
    }
