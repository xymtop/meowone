from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Sequence

from app.capability.base import BaseCapability
from app.capability.registry import CapabilityRegistry


@dataclass(frozen=True)
class CapabilityFilter:
    """Optional filter knobs for per-channel/per-turn tool shaping."""

    allow_names: Optional[Sequence[str]] = None
    deny_names: Optional[Sequence[str]] = None


class CapabilityRuntime:
    """Composable capability selector built on top of global registry."""

    def __init__(self, base_registry: CapabilityRegistry) -> None:
        self._base = base_registry

    def resolve(
        self,
        *,
        filter: CapabilityFilter | None = None,
        channel_id: str | None = None,
    ) -> CapabilityRegistry:
        # Current phase: explicit include/exclude only.
        # `channel_id` is accepted for forward compatibility with policy mapping.
        _ = channel_id
        caps: Iterable[BaseCapability] = self._base.list_all()

        allow = set(filter.allow_names or []) if filter else set()
        deny = set(filter.deny_names or []) if filter else set()

        out = CapabilityRegistry()
        for cap in caps:
            if allow and cap.name not in allow:
                continue
            if cap.name in deny:
                continue
            out.register(cap)
        return out

