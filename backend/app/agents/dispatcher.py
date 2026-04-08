from __future__ import annotations

import time
import uuid
from typing import Any, Dict, List

import httpx

from app.agents.plan_builder import AgentRuntimePlan
from app.capability.tools.remote_a2a_agent import RemoteA2AAgentCapability
from app.loop.events import DeltaEvent, DoneEvent
from app.loop.input import LoopRunInput
from app.loop.runtime import run_loop
from app.services.agent_execution_log_service import create_execution_log


class AgentDispatcher:
    async def invoke(
        self,
        *,
        plan: AgentRuntimePlan,
        task: str,
        history: List[Dict[str, Any]] | None = None,
        endpoint_base_url: str = "",
    ) -> Dict[str, Any]:
        execution_id = str(uuid.uuid4())
        if plan.execution_transport == "internal_loop":
            result = await self._invoke_internal(plan=plan, task=task, history=history or [])
        else:
            result = await self._invoke_external_a2a(plan=plan, task=task, base_url=endpoint_base_url)
        try:
            await create_execution_log(
                execution_id=execution_id,
                agent_name=plan.agent_name,
                agent_type=plan.agent_type,
                status="success" if result.get("ok") else "failed",
                duration_ms=int(result.get("duration_ms") or 0),
                error_code=result.get("error_code"),
            )
        except Exception:  # noqa: BLE001
            pass
        result["execution_id"] = execution_id
        return result

    async def _invoke_internal(
        self, *, plan: AgentRuntimePlan, task: str, history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        run_input = LoopRunInput(
            user_message=task,
            history=history,
            capabilities=plan.resolved_capabilities,
            extra_system=plan.resolved_system_prompt,
            limits=plan.resolved_limits,
            loop_mode=plan.loop_mode,
        )
        text_parts: List[str] = []
        done: DoneEvent | None = None
        async for event in run_loop(run_input):
            if isinstance(event, DeltaEvent) and event.content:
                text_parts.append(event.content)
            if isinstance(event, DoneEvent):
                done = event
        return {
            "ok": True,
            "agent_name": plan.agent_name,
            "agent_type": plan.agent_type,
            "output": "".join(text_parts).strip(),
            "duration_ms": int(done.total_duration if done else 0),
            "loop_rounds": int(done.loop_rounds if done else 0),
            "error": None,
            "error_code": None,
        }

    async def _invoke_external_a2a(self, *, plan: AgentRuntimePlan, task: str, base_url: str) -> Dict[str, Any]:
        started = time.perf_counter()
        auth_token = plan.endpoint.metadata_json.get("auth_token") if plan.endpoint.metadata_json else None
        tool = RemoteA2AAgentCapability(
            name=plan.agent_name,
            description=f"Proxy external agent `{plan.agent_name}`",
            base_url=base_url,
            auth_token=auth_token,
        )
        try:
            output = await tool.execute({"task": task})
            lower = str(output).lower()
            error_code = None
            if "missing `a2a-sdk`" in str(output):
                error_code = "A2A_PROTOCOL_ERROR"
            elif "error:" in lower:
                error_code = "A2A_PROTOCOL_ERROR"
            return {
                "ok": error_code is None,
                "agent_name": plan.agent_name,
                "agent_type": plan.agent_type,
                "output": "" if error_code else str(output).strip(),
                "duration_ms": int((time.perf_counter() - started) * 1000),
                "loop_rounds": 0,
                "error": str(output).strip() if error_code else None,
                "error_code": error_code,
            }
        except httpx.ConnectError as exc:
            return self._a2a_error(plan, started, "A2A_UNREACHABLE", str(exc))
        except httpx.TimeoutException as exc:
            return self._a2a_error(plan, started, "A2A_TIMEOUT", str(exc))
        except Exception as exc:  # noqa: BLE001
            return self._a2a_error(plan, started, "A2A_PROTOCOL_ERROR", str(exc))

    @staticmethod
    def _a2a_error(plan: AgentRuntimePlan, started: float, code: str, error: str) -> Dict[str, Any]:
        return {
            "ok": False,
            "agent_name": plan.agent_name,
            "agent_type": plan.agent_type,
            "output": "",
            "duration_ms": int((time.perf_counter() - started) * 1000),
            "loop_rounds": 0,
            "error": error,
            "error_code": code,
        }


agent_dispatcher = AgentDispatcher()
