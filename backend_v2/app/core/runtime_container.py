"""
运行时容器

提供全局单例，包括对话轮次服务。
"""
from __future__ import annotations

from dataclasses import dataclass

from app.gateway.turn_service import ConversationTurnService


@dataclass
class RuntimeContainer:
    turn_service: ConversationTurnService


runtime_container = RuntimeContainer(
    turn_service=ConversationTurnService(),
)
