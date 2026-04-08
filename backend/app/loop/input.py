from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.capability.registry import CapabilityRegistry
from app.loop.context import UserContent


@dataclass
class LoopLimits:
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None


@dataclass
class LoopRunInput:
    """Unified input contract for loop runtime.

    Keep this type framework-agnostic so adapters/gateways can construct one
    run payload and feed it into the same loop kernel.
    """

    user_message: UserContent
    history: List[Dict[str, Any]]
    capabilities: CapabilityRegistry
    extra_system: str = ""
    message_id: Optional[str] = None
    limits: Optional[LoopLimits] = None
    """Resolved model name (matches rows in models table / OpenAI model id)."""
    model: Optional[str] = None

