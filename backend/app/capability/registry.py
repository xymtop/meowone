"""
能力注册表模块

管理所有可用的能力（工具）注册表。
"""

from __future__ import annotations
from typing import Dict, Optional, List
from app.capability.base import BaseCapability
from app.capability.tool_base import BaseTool


class CapabilityRegistry:
    """能力注册表

    管理所有可用的能力（工具），提供注册、查找、列表、转换等功能。
    """

    def __init__(self) -> None:
        """初始化空注册表"""
        self._capabilities: Dict[str, BaseCapability] = {}

    def register(self, capability: BaseCapability) -> None:
        """注册能力

        Args:
            capability: 要注册的能力实例
        """
        self._capabilities[capability.name] = capability

    def get(self, name: str) -> Optional[BaseCapability]:
        """根据名称获取能力

        Args:
            name: 能力名称

        Returns:
            能力实例，不存在则返回 None
        """
        return self._capabilities.get(name)

    def list_all(self) -> List[BaseCapability]:
        """列出所有已注册的能力

        Returns:
            能力实例列表
        """
        return list(self._capabilities.values())

    def to_openai_tools(self) -> List[Dict]:
        """转换为 OpenAI 工具格式

        Returns:
            OpenAI 函数调用格式的工具定义列表
        """
        return [cap.to_openai_tool() for cap in self._capabilities.values()]

    def to_descriptions(self) -> List[Dict[str, str]]:
        """获取能力描述列表

        用于在系统提示中列出可用工具。

        Returns:
            包含 name 和 description 的字典列表
        """
        out: List[Dict[str, str]] = []
        for cap in self._capabilities.values():
            if isinstance(cap, BaseTool):
                # 工具类能力显示权限和分类
                meta = f"[{cap.permission}/{cap.category}]"
                desc = f"{meta} {cap.description}"
            else:
                desc = cap.description
            out.append({"name": cap.name, "description": desc})
        return out


# 全局能力注册表单例
registry = CapabilityRegistry()
