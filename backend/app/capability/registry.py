from __future__ import annotations
from typing import Dict, Optional, List
from app.capability.base import BaseCapability
from app.capability.tool_base import BaseTool


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
        out: List[Dict[str, str]] = []
        for cap in self._capabilities.values():
            if isinstance(cap, BaseTool):
                meta = f"[{cap.permission}/{cap.category}]"
                desc = f"{meta} {cap.description}"
            else:
                desc = cap.description
            out.append({"name": cap.name, "description": desc})
        return out


registry = CapabilityRegistry()
