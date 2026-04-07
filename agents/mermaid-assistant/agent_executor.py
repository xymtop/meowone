"""
Mermaid Assistant executor for a2a-sdk task lifecycle.
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
    (
        "You are a Mermaid diagram specialist. Produce clear, correct Mermaid code and concise "
        "explanations. Prefer output in a fenced mermaid block. If user language is Chinese, "
        "reply in Chinese. If requirements are ambiguous, make minimal reasonable assumptions."
    ),
)


class MermaidAssistantAgentExecutor(AgentExecutor):
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
                    message=new_agent_text_message("Generating mermaid diagram..."),
                ),
            )
        )

        user_text = context.get_user_input()
        logger.info(
            "mermaid_assistant execute: task_id=%s input_len=%s",
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
