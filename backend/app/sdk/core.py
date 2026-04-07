from __future__ import annotations

import base64
import json
from typing import Any, AsyncIterator, Dict, List

from app.gateway.turn_service import ConversationTurnService
from app.loop.context import UserContent
from app.loop.input import LoopLimits
from app.models.message import Attachment


def build_user_content(content: str, attachments: List[Attachment] | None) -> UserContent:
    """OpenAI-compatible user content: string or multimodal parts."""
    atts = attachments or []
    if not atts:
        return content or ""
    parts: List[Dict[str, Any]] = []
    if (content or "").strip():
        parts.append({"type": "text", "text": content})
    for att in atts:
        mime = (att.mime or "application/octet-stream").strip()
        name = att.name or "attachment"
        if mime.startswith("image/") and att.data:
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{att.data}"},
                }
            )
        elif att.data:
            try:
                raw = base64.b64decode(att.data, validate=False)
            except Exception:
                raw = b""
            snippet = raw.decode("utf-8", errors="replace")[:12000]
            parts.append(
                {
                    "type": "text",
                    "text": f"\n\n--- File: {name} ({mime}) ---\n{snippet}",
                }
            )
    if not parts:
        return content or ""
    if len(parts) == 1 and parts[0].get("type") == "text":
        return parts[0].get("text") or ""
    return parts


def make_display_content(content: str, attachments: List[Attachment] | None) -> str:
    base = (content or "").strip()
    n = len(attachments or [])
    if n:
        suffix = f"\n\n[{n} attachment(s)]" if base else f"[{n} attachment(s)]"
        return (base + suffix).strip()
    return base


def safe_limits(max_rounds: int | None, max_tool_phases: int | None, timeout_seconds: int | None) -> LoopLimits | None:
    mr = max(1, min(int(max_rounds), 64)) if isinstance(max_rounds, int) else None
    mt = max(1, min(int(max_tool_phases), 32)) if isinstance(max_tool_phases, int) else None
    ts = max(5, min(int(timeout_seconds), 600)) if isinstance(timeout_seconds, int) else None
    if mr is None and mt is None and ts is None:
        return None
    return LoopLimits(max_rounds=mr, max_tool_phases=mt, timeout_seconds=ts)


async def stream_turn_sse(
    *,
    turn_service: ConversationTurnService,
    session_id: str,
    user_content: UserContent,
    exclude_for_history: str,
    channel_id: str = "web",
    scheduler_mode: str | None = None,
    task_tag: str | None = None,
    limits: LoopLimits | None = None,
) -> AsyncIterator[Dict[str, str]]:
    async for item in turn_service.stream_turn(
        session_id=session_id,
        user_content=user_content,
        exclude_for_history=exclude_for_history,
        channel_id=channel_id,
        scheduler_mode=scheduler_mode,
        task_tag=task_tag,
        limits=limits,
    ):
        yield item


async def stream_openai_chunks_from_sse(
    *,
    model: str,
    turn_events: AsyncIterator[Dict[str, str]],
) -> AsyncIterator[str]:
    """Adapt internal turn SSE events into OpenAI Chat Completions streaming chunks."""
    created = 0
    chunk_id = "chatcmpl-meowone"
    role_sent = False

    async for ev in turn_events:
        name = ev.get("event")
        raw = ev.get("data", "")
        try:
            data = json.loads(raw) if raw else {}
        except Exception:
            data = {}

        if name == "delta":
            content = str(data.get("content") or "")
            # OpenAI stream convention: first chunk carries role.
            if not role_sent:
                role_sent = True
                first = {
                    "id": chunk_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}],
                }
                yield json.dumps(first, ensure_ascii=False)
            if content:
                ch = {
                    "id": chunk_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model,
                    "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": None}],
                }
                yield json.dumps(ch, ensure_ascii=False)
        elif name == "done":
            done = {
                "id": chunk_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield json.dumps(done, ensure_ascii=False)
            yield "[DONE]"
            return

