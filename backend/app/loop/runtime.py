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


async def run_loop(
    loop_input: LoopRunInput,
) -> AsyncIterator[LoopEvent]:
    """Run the Agent Loop. Yields LoopEvent objects.

    This is the heart of MeowOne: a pure async generator
    with no dependency on FastAPI or any web framework.
    """
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
    context.add_user_message(loop_input.user_message)  # str or multimodal parts

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
            # 单条 assistant 消息携带本轮全部 tool_calls，便于模型并行发起多工具 + 服务端 asyncio 真并行
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
                """执行单个工具；异常在内部转为错误结果字符串，保证 gather 不因单路失败而整批中断。"""
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

            # Mermaid specialist output should be delivered verbatim to avoid
            # main-model post-processing that may break strict fenced protocol.
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
