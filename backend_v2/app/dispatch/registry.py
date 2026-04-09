"""
调度策略注册表

通过 @dispatch_strategy("name") 装饰器注册策略函数。
每个策略函数签名：
    async def xxx(ctx: DispatchContext) -> AsyncIterator[LoopEvent]

所有策略模块必须在应用启动时被导入以完成注册。
"""
from __future__ import annotations

from typing import Any, AsyncIterator, Callable, Dict

STRATEGY_REGISTRY: Dict[str, Callable[..., AsyncIterator[Any]]] = {}


def dispatch_strategy(name: str):
    """装饰器：将函数注册为指定名称的调度策略"""
    def decorator(fn: Callable) -> Callable:
        STRATEGY_REGISTRY[name] = fn
        return fn
    return decorator


def get_strategy(name: str) -> Callable | None:
    return STRATEGY_REGISTRY.get(name)
