"""
文档类子智能体：在 A2A 服务端处理摘要/改写/README 等写作任务（a2a-sdk 事件流）。

与 code-writer 共用同一套状态机模式，仅系统提示词不同。
"""
from __future__ import annotations

import logging
import os

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import (
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatus,
    TaskStatusUpdateEvent,
)
from a2a.utils.artifact import new_text_artifact
from a2a.utils.message import new_agent_text_message
from a2a.utils.task import new_task

from llm import complete

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a documentation and writing assistant. Summarize clearly, outline structure, "
    "and produce readable prose. If the user writes in Chinese, reply in Chinese.",
)


class DocAssistantAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        task = context.current_task or new_task(context.message)
        await event_queue.enqueue_event(task)

        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                final=False,
                status=TaskStatus(
                    state=TaskState.working,
                    message=new_agent_text_message("Processing request..."),
                ),
            )
        )

        user_text = context.get_user_input()
        logger.info(
            "doc_assistant 执行: task_id=%s 输入长度=%s",
            context.task_id,
            len(user_text),
        )
        result = await complete(SYSTEM_PROMPT, user_text)

        await event_queue.enqueue_event(
            TaskArtifactUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                artifact=new_text_artifact(name="result", text=result),
            )
        )
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                final=True,
                status=TaskStatus(state=TaskState.completed),
            )
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise RuntimeError("cancel not supported")
