from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseCapability(ABC):
    name: str
    description: str
    parameters_schema: Dict[str, Any]

    @abstractmethod
    async def execute(self, params: Dict[str, Any]) -> Any:
        ...

    def to_openai_tool(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }
