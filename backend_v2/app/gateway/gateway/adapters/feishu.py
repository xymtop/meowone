from __future__ import annotations

"""Feishu adapter skeleton.

Current phase: keep this module as a protocol boundary placeholder so gateway
logic does not leak into HTTP route handlers.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FeishuInboundMessage:
    chat_id: str
    text: str
    user_id: Optional[str] = None
    message_id: Optional[str] = None


def to_channel_id() -> str:
    return "feishu"


def external_thread_id_from_chat(chat_id: str) -> str:
    return chat_id

