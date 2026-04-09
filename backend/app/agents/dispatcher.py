"""
智能体调度器模块

负责调用智能体执行任务的核心调度逻辑。

支持两种调用方式：
1. 内部循环（internal_loop）：直接在平台内部运行智能体循环
2. 外部 A2A：调用外部智能体服务的 HTTP 接口

主要功能：
- invoke: 根据执行传输类型选择内部或外部调用
- _invoke_internal: 内部循环执行
- _invoke_external_a2a: 外部 A2A 调用
"""

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
    """智能体调度器

    根据智能体的执行传输类型，调度任务到合适的执行器。
    """

    async def invoke(
        self,
        *,
        plan: AgentRuntimePlan,
        task: str,
        history: List[Dict[str, Any]] | None = None,
        endpoint_base_url: str = "",
    ) -> Dict[str, Any]:
        """调用智能体执行任务

        根据计划中的执行传输类型，选择内部循环或外部 A2A 调用。

        Args:
            plan: 智能体运行时计划（包含智能体配置、能力、限制等）
            task: 任务描述
            history: 对话历史
            endpoint_base_url: 外部智能体的基础 URL

        Returns:
            执行结果字典，包含 ok、output、duration_ms 等字段
        """
        # 生成执行 ID 用于追踪
        execution_id = str(uuid.uuid4())
        
        # 根据传输类型选择调用方式
        if plan.execution_transport == "internal_loop":
            # 内部循环：直接在平台执行
            result = await self._invoke_internal(plan=plan, task=task, history=history or [])
        else:
            # 外部 A2A：调用外部服务
            result = await self._invoke_external_a2a(plan=plan, task=task, base_url=endpoint_base_url)
        
        # 记录执行日志
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
        
        # 将执行 ID 加入结果
        result["execution_id"] = execution_id
        return result

    async def _invoke_internal(
        self, *, plan: AgentRuntimePlan, task: str, history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """内部循环执行

        构建 LoopRunInput 并运行智能体循环。

        Args:
            plan: 智能体运行时计划
            task: 任务描述
            history: 对话历史

        Returns:
            执行结果
        """
        # 构建循环输入
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
        
        # 运行循环，收集事件
        async for event in run_loop(run_input):
            if isinstance(event, DeltaEvent) and event.content:
                # 收集文本输出
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
        """外部 A2A 调用

        通过 HTTP 调用外部智能体服务。

        Args:
            plan: 智能体运行时计划
            task: 任务描述
            base_url: 外部服务基础 URL

        Returns:
            执行结果
        """
        started = time.perf_counter()
        
        # 获取认证令牌（如果有）
        auth_token = plan.endpoint.metadata_json.get("auth_token") if plan.endpoint.metadata_json else None
        
        # 创建远程 A2A 智能体能力
        tool = RemoteA2AAgentCapability(
            name=plan.agent_name,
            description=f"Proxy external agent `{plan.agent_name}`",
            base_url=base_url,
            auth_token=auth_token,
        )
        
        try:
            # 执行任务
            output = await tool.execute({"task": task})
            
            # 检查是否有错误
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
            # 连接失败
            return self._a2a_error(plan, started, "A2A_UNREACHABLE", str(exc))
        except httpx.TimeoutException as exc:
            # 超时
            return self._a2a_error(plan, started, "A2A_TIMEOUT", str(exc))
        except Exception as exc:  # noqa: BLE001
            # 其他错误
            return self._a2a_error(plan, started, "A2A_PROTOCOL_ERROR", str(exc))

    @staticmethod
    def _a2a_error(plan: AgentRuntimePlan, started: float, code: str, error: str) -> Dict[str, Any]:
        """构建 A2A 错误响应

        Args:
            plan: 智能体运行时计划
            started: 开始时间
            code: 错误码
            error: 错误信息

        Returns:
            错误响应字典
        """
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


# 全局单例调度器实例
agent_dispatcher = AgentDispatcher()
