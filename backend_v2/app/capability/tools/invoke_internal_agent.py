"""
调用内部智能体工具

使用新的 dispatch 层执行内部智能体任务。
"""
from __future__ import annotations

import json
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.dispatch.gateway import dispatch


class InvokeInternalAgentTool(BaseTool):
    name = "invoke_internal_agent"
    display_name = "Invoke internal agent"
    description = (
        "Delegate the current task to a named internal subagent for execution. "
        "The subagent receives full tool access (sandbox, file, terminal, etc.) and returns its result here."
    )
    permission = "standard"
    category = "agents"
    tags = ("internal", "delegate")

    parameters_schema = {
        "type": "object",
        "properties": {
            "agent_name": {"type": "string"},
            "task": {"type": "string"},
        },
        "required": ["agent_name", "task"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        name = str(params.get("agent_name") or "").strip()
        task = str(params.get("task") or "").strip()
        if not name or not task:
            return json.dumps({"ok": False, "error": "agent_name and task are required"}, ensure_ascii=False)

        parts: list[str] = []
        async for event in dispatch(user_message=task, history=[], agent_name=name):
            ev_type = type(event).__name__
            if ev_type == "DeltaEvent" and getattr(event, "content", ""):
                parts.append(event.content)
            elif ev_type == "ErrorEvent":
                return json.dumps(
                    {"ok": False, "error": getattr(event, "message", "")},
                    ensure_ascii=False,
                )

        return json.dumps({"ok": True, "output": "".join(parts)}, ensure_ascii=False)
