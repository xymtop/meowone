from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agents.definition import AgentDefinition
from app.agents.dispatcher import agent_dispatcher
from app.agents.plan_builder import AgentPlanBuilder
from app.services import agent_service

"""
# 智能体执行 API

统一执行内部/外部智能体。

## 主要功能
- 执行单个智能体任务
- 支持内部和外部智能体
- 返回标准化执行结果

## 执行结果格式
```json
{
  "ok": true,
  "agent_name": "writer",
  "agent_type": "internal",
  "output": "...",
  "duration_ms": 1234,
  "loop_rounds": 3,
  "error": null,
  "execution_id": "uuid"
}
```

## 错误码
- `A2A_UNREACHABLE` - 外部智能体不可达
- `A2A_TIMEOUT` - 调用超时
- `A2A_PROTOCOL_ERROR` - 协议错误
"""
router = APIRouter(prefix="/api/agent-executions", tags=["智能体执行"])


class AgentExecutionRequest(BaseModel):
    agent_name: str
    task: str
    history: Optional[List[Dict[str, Any]]] = None
    overrides: Optional[Dict[str, Any]] = None


@router.post("")
async def execute_agent(body: AgentExecutionRequest) -> Dict[str, Any]:
    agent_name = body.agent_name.strip()
    task = body.task.strip()
    if not agent_name or not task:
        raise HTTPException(status_code=400, detail="agent_name and task are required")
    row = await agent_service.get_agent(name=agent_name, agent_type="internal")
    if row is None:
        row = await agent_service.get_agent(name=agent_name, agent_type="external")
    if row is None:
        raise HTTPException(status_code=404, detail=f"agent not found: {agent_name}")
    definition = AgentDefinition.from_row(row)
    try:
        definition.validate()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    builder = AgentPlanBuilder()
    plan = await builder.build(definition, overrides=body.overrides or {}, channel_id="api_agent_execution")
    result = await agent_dispatcher.invoke(
        plan=plan,
        task=task,
        history=body.history or [],
        endpoint_base_url=definition.endpoint.base_url,
    )
    if not result.get("ok"):
        code = str(result.get("error_code") or "")
        if code.startswith("A2A_"):
            raise HTTPException(status_code=502, detail=result)
    return result
