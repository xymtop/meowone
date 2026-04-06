from __future__ import annotations
from typing import Dict, Optional, List
from app.capability.base import BaseCapability


class CapabilityRegistry:
    def __init__(self) -> None:
        self._capabilities: Dict[str, BaseCapability] = {}

    def register(self, capability: BaseCapability) -> None:
        self._capabilities[capability.name] = capability

    def get(self, name: str) -> Optional[BaseCapability]:
        return self._capabilities.get(name)

    def list_all(self) -> List[BaseCapability]:
        return list(self._capabilities.values())

    def to_openai_tools(self) -> List[Dict]:
        return [cap.to_openai_tool() for cap in self._capabilities.values()]

    def to_descriptions(self) -> List[Dict[str, str]]:
        return [
            {"name": cap.name, "description": cap.description}
            for cap in self._capabilities.values()
        ]


registry = CapabilityRegistry()
