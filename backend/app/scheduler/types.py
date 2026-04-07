from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.capability.runtime import CapabilityFilter


@dataclass(frozen=True)
class SchedulerDecision:
    mode: str
    capability_filter: Optional[CapabilityFilter] = None
    system_hint: str = ""
