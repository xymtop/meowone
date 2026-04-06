from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class ThinkingEvent:
    step: int
    description: str
    event_type: str = field(default="thinking", init=False)


@dataclass
class DeltaEvent:
    message_id: str
    content: str
    done: bool = False
    event_type: str = field(default="delta", init=False)


@dataclass
class CardEvent:
    message_id: str
    card: Dict[str, Any]
    event_type: str = field(default="card", init=False)


@dataclass
class ToolCallEvent:
    tool_call_id: str
    capability_name: str
    params: Dict[str, Any]
    event_type: str = field(default="tool_call", init=False)


@dataclass
class ToolResultEvent:
    tool_call_id: str
    capability_name: str
    result: Any
    success: bool
    event_type: str = field(default="tool_result", init=False)


@dataclass
class ErrorEvent:
    code: str
    message: str
    event_type: str = field(default="error", init=False)


@dataclass
class DoneEvent:
    message_id: str
    loop_rounds: int
    total_duration: float
    event_type: str = field(default="done", init=False)


LoopEvent = Any
