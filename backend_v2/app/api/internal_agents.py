"""
内部智能体运行 API（新版）

使用新的 dispatch 层执行内部智能体。
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services import agent_service
from app.dispatch.gateway import dispatch

router = APIRouter(prefix="/api/internal-agents", tags=["内部智能体"])


class InternalAgentCreateRequest(BaseModel):
    name: str
    description: str = ""
    system_prompt: str = ""
    mcp_servers: Optional[List[str]] = None
    agent_skills: Optional[List[str]] = None
    allow_tools: Optional[List[str]] = None
    deny_tools: Optional[List[str]] = None
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None
    prompt_key: str = ""
    loop_mode: str = "react"


class InternalAgentInvokeRequest(BaseModel):
    task: str
    history: Optional[List[Dict[str, Any]]] = None


@router.get("")
async def list_internal_agents() -> Dict[str, Any]:
    """列出所有内部智能体（从 agents 表查询）"""
    items = await agent_service.list_agents(agent_type="internal")
    agents = [
        {"name": a.get("name"), "description": a.get("description", "")}
        for a in items
    ]
    return {"count": len(agents), "agents": agents}


@router.post("")
async def create_internal_agent(body: InternalAgentCreateRequest) -> Dict[str, Any]:
    """创建内部智能体（写入 agents 表）"""
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    row = await agent_service.get_agent(name=name, agent_type="internal")
    if row is not None:
        raise HTTPException(status_code=409, detail=f"internal agent already exists: {name}")

    await agent_service.upsert_internal_agent(
        name=name,
        description=(body.description or "").strip(),
        system_prompt=(body.system_prompt or "").strip(),
        mcp_servers=[x for x in (body.mcp_servers or []) if x.strip()],
        agent_skills=[x for x in (body.agent_skills or []) if x.strip()],
        allow_tools=[x for x in (body.allow_tools or []) if x.strip()],
        deny_tools=[x for x in (body.deny_tools or []) if x.strip()],
        max_rounds=body.max_rounds,
        max_tool_phases=body.max_tool_phases,
        timeout_seconds=body.timeout_seconds,
        prompt_key=(body.prompt_key or "").strip(),
        loop_mode=(body.loop_mode or "react").strip(),
    )

    saved = await agent_service.get_agent(name=name, agent_type="internal")
    return {"ok": True, "agent": saved}


@router.post("/{agent_name}/invoke")
async def invoke_internal_agent(agent_name: str, body: InternalAgentInvokeRequest) -> Dict[str, Any]:
    """通过 dispatch 层调用指定的内部智能体"""
    task = (body.task or "").strip()
    if not task:
        raise HTTPException(status_code=400, detail="task is required")

    agent_name = (agent_name or "").strip()
    if not agent_name:
        raise HTTPException(status_code=400, detail="agent_name is required")

    row = await agent_service.get_agent(name=agent_name, agent_type="internal")
    if row is None:
        raise HTTPException(status_code=404, detail=f"internal agent not found: {agent_name}")

    start = time.perf_counter()
    loop_rounds = 0
    text_parts: List[str] = []
    error_code = ""

    async for event in dispatch(
        user_message=task,
        history=body.history or [],
        agent_name=agent_name,
    ):
        ev_type = type(event).__name__
        if ev_type == "DeltaEvent":
            if getattr(event, "content", ""):
                text_parts.append(event.content)
        elif ev_type == "DoneEvent":
            loop_rounds = getattr(event, "loop_rounds", 0)
        elif ev_type == "ErrorEvent":
            error_code = getattr(event, "code", "")

    output = "".join(text_parts).strip()
    duration_ms = int((time.perf_counter() - start) * 1000)

    return {
        "ok": error_code == "",
        "agent_name": agent_name,
        "output": output,
        "loop_rounds": loop_rounds,
        "duration_ms": duration_ms,
    }
