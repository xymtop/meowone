"""
Direct Loop 算法（直连模式）

最基础的 loop 算法：
- 不使用任何工具（tools=None）
- 不使用 MCP/MCP 服务器
- 保留完整的对话上下文历史（system + history + 当前用户消息）

适用场景：简单问答、闲聊、无需工具的纯生成任务。

终止条件：LLM 返回文本（一次性完成，无循环）。

注册名称: "direct"
"""
from __future__ import annotations

import logging
import time
from typing import AsyncIterator

from app.loop.registry import loop_algorithm
from app.loop.context import LoopContext
from app.loop.events import DeltaEvent, ErrorEvent, DoneEvent, LoopEvent
from app.llm.client import chat_completion_stream

logger = logging.getLogger(__name__)


@loop_algorithm("direct")
async def direct_loop(ctx: LoopContext) -> AsyncIterator[LoopEvent]:
    """
    Direct Loop（直连模式）

    逻辑极为简单：
    1. 构造 messages：[system_prompt, user_message]
    2. 调用 LLM（无工具）
    3. 流式返回文本，直到结束
    4. yield DoneEvent
    """
    message_id = ctx.message_id
    model = ctx.model

    start_time = time.time()
    round_num = 0

    # 使用 LoopContext 中已组装好的消息列表（包含 system + history + 当前用户消息）
    # 不传工具，因此 LLM 无法调用任何工具
    messages = ctx.get_messages()

    logger.info("direct_loop: message_id=%s, messages_count=%d",
                message_id, len(messages))

    accumulated_content = ""
    round_num = 1

    try:
        async for chunk in chat_completion_stream(
            messages=messages,
            tools=None,
            model=model,
        ):
            if chunk["type"] == "content_delta":
                accumulated_content += chunk["content"]
                yield DeltaEvent(message_id=message_id, content=chunk["content"], done=False)
    except Exception as e:
        logger.error("direct_loop LLM 调用失败: message_id=%s, error=%s", message_id, e)
        yield ErrorEvent(code="LLM_ERROR", message=str(e))
        yield DoneEvent(
            message_id=message_id,
            loop_rounds=1,
            total_duration=(time.time() - start_time) * 1000,
        )
        return

    # 流式输出结束标记
    yield DeltaEvent(message_id=message_id, content="", done=True)

    yield DoneEvent(
        message_id=message_id,
        loop_rounds=round_num,
        total_duration=(time.time() - start_time) * 1000,
    )
