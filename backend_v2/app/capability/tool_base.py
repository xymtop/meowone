"""
工具基类模块

定义工具的元数据和结构化结果。
"""

from __future__ import annotations

from abc import ABC
from dataclasses import dataclass
from typing import Any, List

from app.capability.base import BaseCapability


@dataclass
class ToolExecutionResult:
    """工具执行结果包装器

    用于包装工具输出，支持特殊控制信号。
    
    Attributes:
        payload: 执行结果负载
        stop_loop: 是否结束智能体循环（True 时不再进行下一轮 LLM 调用）
                  例如：A2A 回复是最终的，不需要继续循环
    """
    payload: Any
    stop_loop: bool = False


class BaseTool(BaseCapability, ABC):
    """工具基类

    继承自 BaseCapability 并添加工具特定的元数据。

    约定：
    - display_name: 显示名称
    - permission: 权限级别（standard/sensitive/admin）
    - category: 分类
    - tags: 标签元组

    注意：permission 目前仅作为信息标记，待完善请求级别的 RBAC（如管理员专属的 bash）。
    """

    display_name: str = ""
    permission: str = "standard"  # standard | sensitive | admin
    category: str = "general"
    tags: tuple[str, ...] = ()

    def describe_for_prompt(self) -> str:
        """生成用于提示的描述行

        Returns:
            格式化的描述字符串，如 "**tool_name** (显示名称) [权限]: 描述 — tags: xxx"
        """
        line = f"- **{self.name}** ({self.display_name or self.name}) [{self.permission}]: {self.description}"
        if self.tags:
            line += f" — tags: {', '.join(self.tags)}"
        return line
