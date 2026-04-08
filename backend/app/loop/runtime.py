from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from typing import AsyncIterator, List, Dict, Any

from app.capability.tool_base import ToolExecutionResult
from app.loop.events import (
    ThinkingEvent, DeltaEvent, CardEvent, ToolCallEvent,
    ToolResultEvent, ErrorEvent, DoneEvent, LoopEvent,
)
from app.loop.context import LoopContext
from app.loop.input import LoopRunInput
from app.llm.client import chat_completion_stream
from app.llm.prompts import build_system_prompt
from app.config import LOOP_MAX_ROUNDS, LOOP_MAX_TOOL_PHASES, LOOP_TIMEOUT_SECONDS

# 调度与工具执行日志（便于排查「是否并行」「哪一步失败」）
logger = logging.getLogger(__name__)


# 支持的 loop_mode 列表（用于验证）
SUPPORTED_LOOP_MODES = frozenset(["react", "plan_exec", "critic", "hierarchical"])

# 默认 loop_mode
DEFAULT_LOOP_MODE = "react"


def _get_loop_mode(loop_input: LoopRunInput) -> str:
    """从 LoopRunInput 获取 loop_mode，兜底为默认值。"""
    mode = getattr(loop_input, "loop_mode", None) or ""
    if mode not in SUPPORTED_LOOP_MODES:
        return DEFAULT_LOOP_MODE
    return mode


async def _run_react(loop_input: LoopRunInput) -> AsyncIterator[LoopEvent]:
    """标准 ReAct 模式：思考 → 行动 → 观察（同一轮内可并行多工具）。"""
    message_id = loop_input.message_id or str(uuid.uuid4())
    capabilities = loop_input.capabilities

    start_time = time.time()
    round_num = 0
    tool_phases = 0

    system_prompt = build_system_prompt(
        capabilities.to_descriptions(),
        extra_system=loop_input.extra_system,
    )
    context = LoopContext(system_prompt, loop_input.history)
    context.add_user_message(loop_input.user_message)

    tools = capabilities.to_openai_tools() if capabilities.list_all() else None

    max_rounds = loop_input.limits.max_rounds if loop_input.limits and loop_input.limits.max_rounds else LOOP_MAX_ROUNDS
    max_tool_phases = (
        loop_input.limits.max_tool_phases
        if loop_input.limits and loop_input.limits.max_tool_phases
        else LOOP_MAX_TOOL_PHASES
    )
    timeout_seconds = (
        loop_input.limits.timeout_seconds
        if loop_input.limits and loop_input.limits.timeout_seconds
        else LOOP_TIMEOUT_SECONDS
    )

    while round_num < max_rounds:
        round_num += 1
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            yield ErrorEvent(code="TIMEOUT", message="Loop execution timed out")
            break

        if round_num > 1:
            yield ThinkingEvent(step=round_num, description="Thinking...")

        accumulated_content = ""
        tool_calls: List[Dict[str, Any]] = []
        has_content = False

        try:
            async for chunk in chat_completion_stream(
                messages=context.get_messages(),
                tools=tools,
                model=loop_input.model,
            ):
                if chunk["type"] == "content_delta":
                    has_content = True
                    accumulated_content += chunk["content"]
                    yield DeltaEvent(
                        message_id=message_id,
                        content=chunk["content"],
                        done=False,
                    )
                elif chunk["type"] == "tool_call":
                    tool_calls.append(chunk)
                elif chunk["type"] == "done":
                    pass
        except Exception as e:
            yield ErrorEvent(code="LLM_ERROR", message=str(e))
            break

        if has_content and not tool_calls:
            context.add_assistant_message(accumulated_content)
            yield DeltaEvent(message_id=message_id, content="", done=True)
            break

        if tool_calls:
            context.add_assistant_tool_calls(
                [
                    {"id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]}
                    for tc in tool_calls
                ]
            )
            names = [tc["name"] for tc in tool_calls]
            logger.info(
                "本轮并行调度: round=%s tools=%s count=%s",
                round_num,
                names,
                len(tool_calls),
            )
            desc = (
                f"并行执行 {len(tool_calls)} 个工具: {', '.join(names)}"
                if len(tool_calls) > 1
                else f"Using {names[0]}..."
            )
            yield ThinkingEvent(step=round_num, description=desc)

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

            async def _execute_one(tc: Dict[str, Any]) -> Dict[str, Any]:
                tid = tc["id"]
                name = tc["name"]
                capability = capabilities.get(name)
                if not capability:
                    err = json.dumps(
                        {"error": f"Unknown capability: {name}"}, ensure_ascii=False
                    )
                    logger.warning("未知工具: %s", name)
                    return {
                        "tool_call_id": tid,
                        "name": name,
                        "result_str": err,
                        "result": None,
                        "stop_loop": False,
                        "error_code": "UNKNOWN_CAPABILITY",
                        "error_message": f"Unknown capability: {name}",
                    }
                try:
                    raw_args = tc.get("arguments") or "{}"
                    params = json.loads(raw_args)
                    raw = await capability.execute(params)
                    stop_loop = False
                    payload: Any = raw
                    if isinstance(raw, ToolExecutionResult):
                        stop_loop = raw.stop_loop
                        payload = raw.payload
                    if isinstance(payload, (dict, list)):
                        result_str = json.dumps(payload, ensure_ascii=False)
                    else:
                        result_str = str(payload)
                    logger.info("工具完成: %s id=%s stop_loop=%s", name, tid, stop_loop)
                    return {
                        "tool_call_id": tid,
                        "name": name,
                        "result_str": result_str,
                        "result": payload,
                        "stop_loop": stop_loop,
                        "error_code": None,
                        "error_message": None,
                    }
                except Exception as e:
                    logger.exception("工具失败: %s", name)
                    err = json.dumps({"error": str(e)}, ensure_ascii=False)
                    return {
                        "tool_call_id": tid,
                        "name": name,
                        "result_str": err,
                        "result": None,
                        "stop_loop": False,
                        "error_code": "TOOL_ERROR",
                        "error_message": f"{name} failed: {e}",
                    }

            outcomes = await asyncio.gather(*[_execute_one(tc) for tc in tool_calls])

            for out in outcomes:
                context.add_tool_result(out["tool_call_id"], out["result_str"])
                payload = out["result"] if out["result"] is not None else out["result_str"]
                ok = out.get("error_code") is None
                yield ToolResultEvent(
                    tool_call_id=out["tool_call_id"],
                    capability_name=out["name"],
                    result=payload,
                    success=ok,
                )
                if out["error_code"] == "UNKNOWN_CAPABILITY":
                    yield ErrorEvent(
                        code="UNKNOWN_CAPABILITY",
                        message=out["error_message"] or "",
                    )
                elif out["error_code"] == "TOOL_ERROR":
                    yield ErrorEvent(
                        code="TOOL_ERROR",
                        message=out["error_message"] or "",
                    )
                else:
                    res = out["result"]
                    if (
                        isinstance(res, dict)
                        and "type" in res
                        and res["type"] in ("info", "action", "form")
                    ):
                        yield CardEvent(message_id=message_id, card=res)

            if (
                len(outcomes) == 1
                and outcomes[0].get("error_code") is None
                and outcomes[0].get("name") == "mermaid_assistant"
            ):
                raw_result = outcomes[0].get("result_str") or ""
                if raw_result.strip().startswith("```mermaid"):
                    context.add_assistant_message(raw_result)
                    yield DeltaEvent(
                        message_id=message_id,
                        content=raw_result,
                        done=False,
                    )
                    yield DeltaEvent(message_id=message_id, content="", done=True)
                    break

            tool_phases += 1
            if tool_phases >= max_tool_phases:
                logger.info(
                    "Stopping agent loop: max_tool_phases=%s reached (no further tool rounds).",
                    max_tool_phases,
                )
                break

            continue

        break

    total_duration = (time.time() - start_time) * 1000
    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=total_duration,
    )


async def _run_plan_exec(loop_input: LoopRunInput) -> AsyncIterator[LoopEvent]:
    """计划-执行分离模式：先让模型生成结构化计划，再按计划逐步执行。"""
    message_id = loop_input.message_id or str(uuid.uuid4())
    capabilities = loop_input.capabilities

    start_time = time.time()

    system_prompt = build_system_prompt(
        capabilities.to_descriptions(),
        extra_system=(
            loop_input.extra_system
            + "\n\n## 计划-执行模式\n"
            + "你必须先输出一个结构化执行计划，然后再执行工具。\n"
            + "计划格式要求：\n"
            + "1. 以「## 执行计划」开头的章节\n"
            + "2. 列出清晰有序的执行步骤（如「步骤1: 分析文件」「步骤2: 修改代码」）\n"
            + "3. 计划必须与用户任务直接相关\n"
            + "4. 计划确定后再开始执行工具（不要在计划阶段调用工具）"
        ),
    )
    context = LoopContext(system_prompt, loop_input.history)
    context.add_user_message(loop_input.user_message)

    tools = capabilities.to_openai_tools() if capabilities.list_all() else None

    max_rounds = loop_input.limits.max_rounds if loop_input.limits and loop_input.limits.max_rounds else LOOP_MAX_ROUNDS
    max_tool_phases = (
        loop_input.limits.max_tool_phases
        if loop_input.limits and loop_input.limits.max_tool_phases
        else LOOP_MAX_TOOL_PHASES
    )
    timeout_seconds = (
        loop_input.limits.timeout_seconds
        if loop_input.limits and loop_input.limits.timeout_seconds
        else LOOP_TIMEOUT_SECONDS
    )

    # 第一阶段：规划（不允许工具调用）
    plan_content = ""
    has_tool_calls_in_plan = False

    yield ThinkingEvent(step=1, description="计划阶段：生成结构化执行计划...")

    try:
        async for chunk in chat_completion_stream(
            messages=context.get_messages(),
            tools=None,  # 规划阶段不允许工具
            model=loop_input.model,
        ):
            if chunk["type"] == "content_delta":
                plan_content += chunk["content"]
                yield DeltaEvent(
                    message_id=message_id,
                    content=chunk["content"],
                    done=False,
                )
    except Exception as e:
        yield ErrorEvent(code="LLM_ERROR", message=str(e))
        yield DoneEvent(message_id=message_id, loop_rounds=1, total_duration=(time.time() - start_time) * 1000)
        return

    context.add_assistant_message(plan_content)

    # 检查规划内容中是否隐含了工具调用意图
    if "tool_calls" in plan_content.lower() or "```json" in plan_content:
        has_tool_calls_in_plan = True

    if has_tool_calls_in_plan:
        yield ThinkingEvent(step=1, description="计划阶段：发现潜在工具调用，将继续规划...")
    else:
        yield ThinkingEvent(step=1, description="计划阶段完成，开始执行...")

    # 第二阶段：执行（构建新上下文，仅包含计划作为 system hint）
    exec_system_prompt = build_system_prompt(
        capabilities.to_descriptions(),
        extra_system=(
            loop_input.extra_system
            + "\n\n## 执行阶段\n"
            + "请严格按照以下计划执行任务，不要偏离计划。\n\n"
            + "== 计划 ==\n"
            + plan_content
            + "\n== 计划结束 =="
        ),
    )
    exec_context = LoopContext(exec_system_prompt, [])
    exec_context.add_user_message(loop_input.user_message)

    round_num = 1
    tool_phases = 0

    while round_num < max_rounds:
        round_num += 1
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            yield ErrorEvent(code="TIMEOUT", message="Loop execution timed out")
            break

        yield ThinkingEvent(step=round_num, description="执行阶段：Thinking...")

        accumulated_content = ""
        tool_calls: List[Dict[str, Any]] = []
        has_content = False

        try:
            async for chunk in chat_completion_stream(
                messages=exec_context.get_messages(),
                tools=tools,
                model=loop_input.model,
            ):
                if chunk["type"] == "content_delta":
                    has_content = True
                    accumulated_content += chunk["content"]
                    yield DeltaEvent(
                        message_id=message_id,
                        content=chunk["content"],
                        done=False,
                    )
                elif chunk["type"] == "tool_call":
                    tool_calls.append(chunk)
                elif chunk["type"] == "done":
                    pass
        except Exception as e:
            yield ErrorEvent(code="LLM_ERROR", message=str(e))
            break

        if has_content and not tool_calls:
            exec_context.add_assistant_message(accumulated_content)
            yield DeltaEvent(message_id=message_id, content="", done=True)
            break

        if tool_calls:
            exec_context.add_assistant_tool_calls(
                [
                    {"id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]}
                    for tc in tool_calls
                ]
            )
            names = [tc["name"] for tc in tool_calls]
            logger.info("plan_exec 执行阶段: round=%s tools=%s", round_num, names)
            desc = (
                f"执行 {len(tool_calls)} 个工具: {', '.join(names)}"
                if len(tool_calls) > 1
                else f"Using {names[0]}..."
            )
            yield ThinkingEvent(step=round_num, description=desc)

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

            async def _execute_one(tc: Dict[str, Any]) -> Dict[str, Any]:
                tid = tc["id"]
                name = tc["name"]
                capability = capabilities.get(name)
                if not capability:
                    err = json.dumps({"error": f"Unknown capability: {name}"}, ensure_ascii=False)
                    return {
                        "tool_call_id": tid, "name": name, "result_str": err,
                        "result": None, "stop_loop": False,
                        "error_code": "UNKNOWN_CAPABILITY", "error_message": f"Unknown capability: {name}",
                    }
                try:
                    raw_args = tc.get("arguments") or "{}"
                    params = json.loads(raw_args)
                    raw = await capability.execute(params)
                    stop_loop = False
                    payload: Any = raw
                    if isinstance(raw, ToolExecutionResult):
                        stop_loop = raw.stop_loop
                        payload = raw.payload
                    result_str = json.dumps(payload, ensure_ascii=False) if isinstance(payload, (dict, list)) else str(payload)
                    return {
                        "tool_call_id": tid, "name": name, "result_str": result_str,
                        "result": payload, "stop_loop": stop_loop,
                        "error_code": None, "error_message": None,
                    }
                except Exception as e:
                    logger.exception("工具失败: %s", name)
                    err = json.dumps({"error": str(e)}, ensure_ascii=False)
                    return {
                        "tool_call_id": tid, "name": name, "result_str": err,
                        "result": None, "stop_loop": False,
                        "error_code": "TOOL_ERROR", "error_message": f"{name} failed: {e}",
                    }

            outcomes = await asyncio.gather(*[_execute_one(tc) for tc in tool_calls])

            for out in outcomes:
                exec_context.add_tool_result(out["tool_call_id"], out["result_str"])
                payload = out["result"] if out["result"] is not None else out["result_str"]
                ok = out.get("error_code") is None
                yield ToolResultEvent(
                    tool_call_id=out["tool_call_id"],
                    capability_name=out["name"],
                    result=payload,
                    success=ok,
                )
                if out["error_code"] == "UNKNOWN_CAPABILITY":
                    yield ErrorEvent(code="UNKNOWN_CAPABILITY", message=out["error_message"] or "")
                elif out["error_code"] == "TOOL_ERROR":
                    yield ErrorEvent(code="TOOL_ERROR", message=out["error_message"] or "")

            tool_phases += 1
            if tool_phases >= max_tool_phases:
                break

            continue

        break

    total_duration = (time.time() - start_time) * 1000
    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=total_duration,
    )


async def run_loop(
    loop_input: LoopRunInput,
) -> AsyncIterator[LoopEvent]:
    """Agent Loop 核心：支持多种执行模式（loop_mode）。

    支持的 loop_mode:
    - react      : 标准 ReAct（默认）
    - plan_exec  : 计划-执行分离
    - critic     : 批评-改进（Todo）
    - multi_agent: 多智能体辩论（Todo）
    - hierarchical: 层级式执行（Todo）
    """
    mode = _get_loop_mode(loop_input)

    if mode == "plan_exec":
        async for ev in _run_plan_exec(loop_input):
            yield ev
        return

    # react 及未知的 mode 都走标准 ReAct
    async for ev in _run_react(loop_input):
        yield ev
