"""
ReAct Loop 算法

思考 → 行动 → 观察 循环。
同一轮内可并行执行多个工具。
终止条件：LLM 返回纯文本（无工具调用）、超时、或达到资源限制。

注册名称: "react"
"""
from __future__ import annotations

import json
import logging
import time
from typing import AsyncIterator

from app.loop.registry import loop_algorithm
from app.loop.context import LoopContext
from app.loop.events import (
    ThinkingEvent, DeltaEvent, CardEvent,
    ToolCallEvent, ToolResultEvent, ErrorEvent, DoneEvent, LoopEvent,
)
from app.loop.tool_executor import execute_tool_calls
from app.llm.client import chat_completion_stream
from app.config import LOOP_MAX_ROUNDS, LOOP_MAX_TOOL_PHASES, LOOP_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


@loop_algorithm("react")
async def react_loop(ctx: LoopContext) -> AsyncIterator[LoopEvent]:
    """
    标准 ReAct Loop

    while True:
        1. 调用 LLM（携带工具列表）
        2. 如果只有文本回复 → 结束
        3. 如果有工具调用 → 并行执行 → 结果加入上下文 → 继续
        4. 超时或达到限制 → 结束
    """
    message_id = ctx.message_id
    capabilities = ctx.capabilities
    limits = ctx.limits

    max_rounds = (limits.max_rounds if limits and limits.max_rounds else None) or LOOP_MAX_ROUNDS
    max_tool_phases = (limits.max_tool_phases if limits and limits.max_tool_phases else None) or LOOP_MAX_TOOL_PHASES
    timeout_seconds = (limits.timeout_seconds if limits and limits.timeout_seconds else None) or LOOP_TIMEOUT_SECONDS

    tools = capabilities.to_openai_tools() if capabilities.list_all() else None

    start_time = time.time()
    round_num = 0
    tool_phases = 0

    while True:
        round_num += 1

        # 超时检查
        if time.time() - start_time > timeout_seconds:
            yield ErrorEvent(code="TIMEOUT", message="Loop execution timed out")
            break

        # 轮次限制
        if round_num > max_rounds:
            logger.info("达到最大轮次 max_rounds=%s，结束循环", max_rounds)
            break

        if round_num > 1:
            yield ThinkingEvent(step=round_num, description="正在思考...")

        accumulated_content = ""
        tool_calls = []
        has_content = False

        try:
            async for chunk in chat_completion_stream(
                messages=ctx.get_messages(),
                tools=tools,
                model=ctx.model,
            ):
                if chunk["type"] == "content_delta":
                    has_content = True
                    accumulated_content += chunk["content"]
                    yield DeltaEvent(message_id=message_id, content=chunk["content"], done=False)
                elif chunk["type"] == "tool_call":
                    tool_calls.append(chunk)
        except Exception as e:
            yield ErrorEvent(code="LLM_ERROR", message=str(e))
            break

        # 纯文本回复 → 结束
        if has_content and not tool_calls:
            ctx.add_assistant_message(accumulated_content)
            yield DeltaEvent(message_id=message_id, content="", done=True)
            break

        # 处理工具调用
        if tool_calls:
            ctx.add_assistant_tool_calls(
                [{"id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]} for tc in tool_calls]
            )
            names = [tc["name"] for tc in tool_calls]
            logger.info("并行调度工具: round=%s tools=%s", round_num, names)

            desc = (
                f"并行执行 {len(tool_calls)} 个工具: {', '.join(names)}"
                if len(tool_calls) > 1
                else f"使用 {names[0]}..."
            )
            yield ThinkingEvent(step=round_num, description=desc)

            # 发出工具调用事件
            for tc in tool_calls:
                try:
                    params = json.loads(tc["arguments"])
                except json.JSONDecodeError:
                    params = {}
                yield ToolCallEvent(
                    tool_call_id=str(tc["id"]),
                    capability_name=tc["name"],
                    params=params,
                )

            # 并行执行
            outcomes = await execute_tool_calls(tool_calls, capabilities)

            # 回填结果
            for out in outcomes:
                ctx.add_tool_result(out["tool_call_id"], out["result_str"])
                ok = out.get("error_code") is None
                yield ToolResultEvent(
                    tool_call_id=out["tool_call_id"],
                    capability_name=out["name"],
                    result=out["result"] if out["result"] is not None else out["result_str"],
                    success=ok,
                )
                if out["error_code"] in ("UNKNOWN_CAPABILITY", "TOOL_ERROR"):
                    yield ErrorEvent(code=out["error_code"], message=out["error_message"] or "")
                elif ok:
                    res = out["result"]
                    if isinstance(res, dict) and res.get("type") in ("info", "action", "form"):
                        yield CardEvent(message_id=message_id, card=res)

            tool_phases += 1
            if tool_phases >= max_tool_phases:
                logger.info("达到最大工具阶段数 max_tool_phases=%s，结束循环", max_tool_phases)
                break

            continue  # 继续下一轮

        # 既无文本也无工具调用（LLM 返回空）
        break

    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=(time.time() - start_time) * 1000,
    )
