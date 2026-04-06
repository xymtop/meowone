from __future__ import annotations
import time
import json
import uuid
from typing import AsyncIterator, Optional, List, Dict, Any

from app.loop.events import (
    ThinkingEvent, DeltaEvent, CardEvent, ToolCallEvent,
    ToolResultEvent, ErrorEvent, DoneEvent, LoopEvent,
)
from app.loop.context import LoopContext
from app.capability.registry import CapabilityRegistry
from app.llm.client import chat_completion_stream
from app.llm.prompts import build_system_prompt
from app.config import LOOP_MAX_ROUNDS, LOOP_TIMEOUT_SECONDS


async def run_loop(
    user_message: str,
    history: List[Dict[str, Any]],
    capabilities: CapabilityRegistry,
    message_id: Optional[str] = None,
) -> AsyncIterator[LoopEvent]:
    """Run the Agent Loop. Yields LoopEvent objects.

    This is the heart of MeowOne: a pure async generator
    with no dependency on FastAPI or any web framework.
    """
    if not message_id:
        message_id = str(uuid.uuid4())

    start_time = time.time()
    round_num = 0

    system_prompt = build_system_prompt(capabilities.to_descriptions())
    context = LoopContext(system_prompt, history)
    context.add_user_message(user_message)

    tools = capabilities.to_openai_tools() if capabilities.list_all() else None

    while round_num < LOOP_MAX_ROUNDS:
        round_num += 1
        elapsed = time.time() - start_time
        if elapsed > LOOP_TIMEOUT_SECONDS:
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
            for tc in tool_calls:
                context.add_tool_call(tc["id"], tc["name"], tc["arguments"])

                capability = capabilities.get(tc["name"])
                if not capability:
                    context.add_tool_result(
                        tc["id"],
                        json.dumps({"error": f"Unknown capability: {tc['name']}"}),
                    )
                    yield ErrorEvent(
                        code="UNKNOWN_CAPABILITY",
                        message=f"Unknown capability: {tc['name']}",
                    )
                    continue

                yield ThinkingEvent(step=round_num, description=f"Using {tc['name']}...")
                yield ToolCallEvent(
                    capability_name=tc["name"],
                    params=json.loads(tc["arguments"]),
                )

                try:
                    params = json.loads(tc["arguments"])
                    result = await capability.execute(params)
                    result_str = (
                        json.dumps(result, ensure_ascii=False)
                        if not isinstance(result, str)
                        else result
                    )

                    context.add_tool_result(tc["id"], result_str)
                    yield ToolResultEvent(capability_name=tc["name"], result=result)

                    if (
                        isinstance(result, dict)
                        and "type" in result
                        and result["type"] in ("info", "action", "form")
                    ):
                        yield CardEvent(message_id=message_id, card=result)

                except Exception as e:
                    error_result = json.dumps({"error": str(e)})
                    context.add_tool_result(tc["id"], error_result)
                    yield ErrorEvent(
                        code="TOOL_ERROR",
                        message=f"{tc['name']} failed: {str(e)}",
                    )

            continue

        break

    total_duration = (time.time() - start_time) * 1000
    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=total_duration,
    )
