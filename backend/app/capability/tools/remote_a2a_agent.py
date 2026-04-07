"""Remote A2A agent capability.

This version is **graceful when `a2a-sdk` is not installed**:
- If `a2a` imports succeed, we stream to the remote agent via official SDK.
- If they fail, the tool is still registered but returns a clear error string.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Dict

import httpx

from app.capability.tool_base import BaseTool
from app.config import TOOL_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

try:  # optional dependency: a2a-sdk
    from a2a.client.client import ClientConfig
    from a2a.client.client_factory import ClientFactory
    from a2a.types import Message, Part, Role, Task, TextPart
    from a2a.utils.artifact import get_artifact_text
    from a2a.utils.message import get_message_text

    A2A_AVAILABLE = True
except Exception:  # pragma: no cover - env specific
    A2A_AVAILABLE = False


def _text_from_task(task: "Task") -> str:  # type: ignore[name-defined]
    if not getattr(task, "artifacts", None):
        return ""
    for art in task.artifacts:
        t = get_artifact_text(art)  # type: ignore[name-defined]
        if t:
            return t
    return ""


class RemoteA2AAgentCapability(BaseTool):
    """Tool that forwards to an A2A agent discovered via /.well-known/agent-card.json.

    When `a2a-sdk` is unavailable (e.g. Python<3.10), the tool stays visible but
    returns a helpful error so the model can fall back to local tools.
    """

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

        if not A2A_AVAILABLE:
            return (
                "Remote A2A agents are not available on this backend: missing `a2a-sdk` "
                "(requires Python >=3.10). Please either upgrade Python for the backend "
                "or run the task locally instead of via this tool."
            )

        timeout = httpx.Timeout(TOOL_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(timeout=timeout) as http:
            logger.info(
                "A2A 调用开始: tool=%s base_url=%s task_len=%s",
                self.name,
                self.base_url,
                len(text),
            )
            client = await ClientFactory.connect(  # type: ignore[name-defined]
                self.base_url,
                client_config=ClientConfig(streaming=False, httpx_client=http),  # type: ignore[name-defined]
            )
            try:
                message = Message(  # type: ignore[name-defined]
                    role=Role.user,  # type: ignore[name-defined]
                    parts=[Part(root=TextPart(text=text))],  # type: ignore[name-defined]
                    message_id=str(uuid.uuid4()),
                )
                reply = ""
                async for chunk in client.send_message(message):
                    if isinstance(chunk, tuple):
                        first, _ = chunk
                        from a2a.types import Task as _Task, Message as _Msg  # type: ignore

                        if isinstance(first, _Task):
                            reply = _text_from_task(first)
                        elif isinstance(first, _Msg):
                            reply = get_message_text(first)  # type: ignore[name-defined]
                    else:
                        from a2a.types import Task as _Task, Message as _Msg  # type: ignore

                        if isinstance(chunk, _Task):
                            reply = _text_from_task(chunk)
                        elif isinstance(chunk, _Msg):
                            reply = get_message_text(chunk)  # type: ignore[name-defined]
                logger.info(
                    "A2A 调用结束: tool=%s reply_len=%s",
                    self.name,
                    len(reply or ""),
                )
                return reply or "(empty response from remote agent)"
            finally:
                await client.close()
