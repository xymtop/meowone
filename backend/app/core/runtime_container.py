from __future__ import annotations

from dataclasses import dataclass

from app.capability.registry import registry
from app.gateway.turn_service import ConversationTurnService


@dataclass
class RuntimeContainer:
    turn_service: ConversationTurnService


runtime_container = RuntimeContainer(
    turn_service=ConversationTurnService(capabilities=registry),
)
