"""
能力基类模块

定义所有能力的抽象基类 BaseCapability。
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseCapability(ABC):
    """能力基类

    所有能力（工具、服务等）都必须继承此类。
    
    Attributes:
        name: 能力名称（唯一标识）
        description: 能力描述
        parameters_schema: 参数 JSON Schema
    """

    name: str
    description: str
    parameters_schema: Dict[str, Any]

    @abstractmethod
    async def execute(self, params: Dict[str, Any]) -> Any:
        """执行能力

        Args:
            params: 执行参数

        Returns:
            执行结果
        """
        ...

    def to_openai_tool(self) -> Dict[str, Any]:
        """转换为 OpenAI 工具格式

        Returns:
            OpenAI 函数调用格式的工具定义
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }
