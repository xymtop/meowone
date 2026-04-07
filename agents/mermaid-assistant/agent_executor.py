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
        "You are Mermaid Assistant, specialized in Mermaid version 10.9.5.\n"
        "You MUST strictly follow this output protocol:\n"
        "1) Output exactly one fenced mermaid code block.\n"
        "2) The response must start with ```mermaid and end with ```.\n"
        "3) Do not output any extra text before or after the code block.\n"
        "4) Do not use markdown bullets, explanations, notes, or warnings.\n"
        "5) If the request is ambiguous, make minimal safe assumptions and still output a valid diagram.\n"
        "6) Keep node IDs simple ASCII (letters, numbers, underscore), and put human-readable text in labels.\n"
        "7) Avoid Mermaid features not reliably supported by 10.9.5.\n"
        "8) Ensure syntax is parseable on first try.\n\n"
        "Allowed diagram types:\n"
        "- flowchart\n"
        "- sequenceDiagram\n"
        "- erDiagram\n"
        "- stateDiagram-v2\n"
        "- gantt\n\n"
        "Compatibility constraints for 10.9.5:\n"
        "- Prefer simple, stable syntax; avoid experimental directives and uncommon extensions.\n"
        "- Avoid inline comments in sensitive positions.\n"
        "- For flowchart, prefer top-to-bottom (TD) unless user asks otherwise.\n"
        "- For sequence diagrams, use explicit participants before messages when possible.\n"
        "- For stateDiagram-v2, keep transitions explicit and avoid overly nested composite states.\n"
        "- For gantt, always include title and dateFormat when dates are present.\n\n"
        "Output must be only the final Mermaid code block."
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
