"""
SDK 核心模块

提供 SDK 层级的工具函数和类型定义。
"""

from __future__ import annotations

import base64
import json
from typing import Any, AsyncIterator, Dict, List

from app.gateway.turn_service import ConversationTurnService
from app.loop.context import UserContent
from app.loop.input import LoopLimits
from app.models.message import Attachment


def build_user_content(content: str, attachments: List[Attachment] | None) -> UserContent:
    """构建用户消息内容

    生成 OpenAI 兼容的用户消息格式，支持字符串或多模态内容。
    图片附件会被转换为 data URI，非图片附件会被包含为文本片段。

    Args:
        content: 文本内容
        attachments: 附件列表

    Returns:
        用户消息内容（字符串或多模态内容列表）
    """
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
            # 图片附件：转换为 data URI
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime};base64,{att.data}"},
                }
            )
        elif att.data:
            # 非图片附件：解码并包含为文本片段
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
    """生成用于显示的内容

    生成用户友好的显示文本，如果有附件会添加附件数量提示。

    Args:
        content: 文本内容
        attachments: 附件列表

    Returns:
        显示用的文本
    """
    base = (content or "").strip()
    n = len(attachments or [])
    if n:
        suffix = f"\n\n[{n} attachment(s)]" if base else f"[{n} attachment(s)]"
        return (base + suffix).strip()
    return base


def safe_limits(max_rounds: int | None, max_tool_phases: int | None, timeout_seconds: int | None) -> LoopLimits | None:
    """安全地构建资源限制

    确保限制值在有效范围内：
    - max_rounds: 1-64
    - max_tool_phases: 1-32
    - timeout_seconds: 5-600

    Args:
        max_rounds: 最大轮次
        max_tool_phases: 最大工具阶段数
        timeout_seconds: 超时秒数

    Returns:
        LoopLimits 实例，如果所有参数都为 None 则返回 None
    """
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
    """流式对话轮次

    封装 turn_service.stream_turn 的异步生成器接口。

    Args:
        turn_service: 对话轮次服务
        session_id: 会话 ID
        user_content: 用户消息内容
        exclude_for_history: 不存入历史的排除内容
        channel_id: 渠道 ID
        scheduler_mode: 调度模式
        task_tag: 任务标签
        limits: 资源限制

    Yields:
        SSE 事件字典
    """
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
    """将内部 SSE 事件转换为 OpenAI 流式格式

    将 MeowOne 内部的事件格式转换为 OpenAI Chat Completions 流式格式。

    Args:
        model: 模型名称
        turn_events: 内部 SSE 事件生成器

    Yields:
        OpenAI 格式的 JSON 字符串
    """
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
            # OpenAI 流式约定：第一块携带 role
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
