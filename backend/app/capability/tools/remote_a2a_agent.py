"""通过官方 a2a-sdk 客户端调用远程 A2A 智能体（JSON-RPC 由 SDK 处理，此处不手写协议）。"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Dict

import httpx
from a2a.client.client import ClientConfig
from a2a.client.client_factory import ClientFactory
from a2a.types import Message, Part, Role, Task, TextPart
from a2a.utils.artifact import get_artifact_text
from a2a.utils.message import get_message_text

from app.capability.tool_base import BaseTool
from app.config import TOOL_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


def _text_from_task(task: Task) -> str:
    if not task.artifacts:
        return ""
    for art in task.artifacts:
        t = get_artifact_text(art)
        if t:
            return t
    return ""


class RemoteA2AAgentCapability(BaseTool):
    """Tool that forwards to an A2A agent discovered via /.well-known/agent-card.json."""

    def __init__(self, name: str, description: str, base_url: str) -> None:
        self.name = name
        self.display_name = name
        self.description = description
        self.permission = "standard"
        self.category = "agents"
        self.tags = ("a2a", "remote")
        self.base_url = base_url.rstrip("/")
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "Full instruction or content to send to the specialist agent.",
                },
            },
            "required": ["task"],
        }

    async def execute(self, params: Dict[str, Any]) -> str:
        text = str(params.get("task") or "").strip()
        if not text:
            return "Error: empty task"

        timeout = httpx.Timeout(TOOL_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout) as http:
            logger.info(
                "A2A 调用开始: tool=%s base_url=%s task_len=%s",
                self.name,
                self.base_url,
                len(text),
            )
            client = await ClientFactory.connect(
                self.base_url,
                client_config=ClientConfig(streaming=False, httpx_client=http),
            )
            try:
                message = Message(
                    role=Role.user,
                    parts=[Part(root=TextPart(text=text))],
                    message_id=str(uuid.uuid4()),
                )
                reply = ""
                async for chunk in client.send_message(message):
                    if isinstance(chunk, tuple):
                        first, _ = chunk
                        if isinstance(first, Task):
                            reply = _text_from_task(first)
                        elif isinstance(first, Message):
                            reply = get_message_text(first)
                    elif isinstance(chunk, Task):
                        reply = _text_from_task(chunk)
                    elif isinstance(chunk, Message):
                        reply = get_message_text(chunk)
                logger.info(
                    "A2A 调用结束: tool=%s reply_len=%s",
                    self.name,
                    len(reply or ""),
                )
                return reply or "(empty response from remote agent)"
            finally:
                await client.close()
