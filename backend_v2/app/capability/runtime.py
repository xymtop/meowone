"""
能力运行时模块

提供能力选择和过滤功能。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Sequence

from app.capability.base import BaseCapability
from app.capability.registry import CapabilityRegistry


@dataclass(frozen=True)
class CapabilityFilter:
    """能力过滤器

    用于按渠道或按请求过滤可用能力。

    Attributes:
        allow_names: 允许的能力名称列表（None 表示不限制）
        deny_names: 禁止的能力名称列表（优先级高于 allow_names）
    """
    allow_names: Optional[Sequence[str]] = None
    deny_names: Optional[Sequence[str]] = None


class CapabilityRuntime:
    """能力运行时

    基于全局注册表的可组合能力选择器。

    支持按名称过滤能力。
    """

    def __init__(self, base_registry: CapabilityRegistry) -> None:
        """初始化能力运行时

        Args:
            base_registry: 基础能力注册表
        """
        self._base = base_registry

    def resolve(
        self,
        *,
        filter: CapabilityFilter | None = None,
        channel_id: str | None = None,
    ) -> CapabilityRegistry:
        """解析能力注册表

        根据过滤器条件从基础注册表中选择能力。

        Args:
            filter: 能力过滤器
            channel_id: 渠道 ID（保留用于未来扩展）

        Returns:
            过滤后的能力注册表
        """
        # 当前阶段：仅支持显式的包含/排除过滤
        # channel_id 为未来扩展保留
        _ = channel_id
        caps: Iterable[BaseCapability] = self._base.list_all()

        # 构建允许和禁止集合
        allow = set(filter.allow_names or []) if filter else set()
        deny = set(filter.deny_names or []) if filter else set()

        out = CapabilityRegistry()
        for cap in caps:
            # 如果有允许列表且当前能力不在列表中，跳过
            if allow and cap.name not in allow:
                continue
            # 如果当前能力在禁止列表中，跳过
            if cap.name in deny:
                continue
            out.register(cap)
        return out
