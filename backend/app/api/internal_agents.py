from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.internal_factory import InternalAgentSpec, internal_agent_factory

"""
# 内部智能体运行 API

运行时内部智能体的管理和调用。

## 主要功能
- 列出所有内部智能体
- 创建内部智能体
- 调用内部智能体执行任务

## 与 /api/agents 的区别
- `/api/agents` - 管理智能体配置（持久化到数据库）
- `/api/internal-agents` - 运行时调用（内存中执行）
"""
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
async def list_internal_agents():
    agents = [a.to_public_dict() for a in await internal_agent_factory.list()]
    return {"count": len(agents), "agents": agents}


@router.post("")
async def create_internal_agent(body: InternalAgentCreateRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    spec = InternalAgentSpec(
        name=name,
        description=body.description.strip(),
        system_prompt=body.system_prompt.strip(),
        mcp_servers=[x for x in (body.mcp_servers or []) if x.strip()],
        agent_skills=[x for x in (body.agent_skills or []) if x.strip()],
        allow_tools=[x for x in (body.allow_tools or []) if x.strip()],
        deny_tools=[x for x in (body.deny_tools or []) if x.strip()],
        max_rounds=body.max_rounds,
        max_tool_phases=body.max_tool_phases,
        timeout_seconds=body.timeout_seconds,
        prompt_key=body.prompt_key.strip(),
        loop_mode=body.loop_mode.strip() or "react",
    )
    saved = await internal_agent_factory.create(spec)
    return {"ok": True, "agent": saved.to_public_dict()}


@router.post("/{agent_name}/invoke")
async def invoke_internal_agent(agent_name: str, body: InternalAgentInvokeRequest):
    if not body.task.strip():
        raise HTTPException(status_code=400, detail="task is required")
    result = await internal_agent_factory.invoke(
        name=agent_name.strip(),
        task=body.task.strip(),
        history=body.history or [],
    )
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=str(result.get("error") or "agent invocation failed"))
    return result
