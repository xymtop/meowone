"""
Loop 算法注册表

通过 @loop_algorithm("name") 装饰器注册 loop 算法函数。
每个算法函数签名：
    async def xxx(ctx: LoopContext) -> AsyncIterator[LoopEvent]

注意：所有算法模块必须在应用启动时被导入，才能完成注册。
"""
from __future__ import annotations

from typing import Any, AsyncIterator, Callable, Dict

# 注册表：name -> 异步生成器函数
LOOP_REGISTRY: Dict[str, Callable[..., AsyncIterator[Any]]] = {}


def loop_algorithm(name: str):
    """装饰器：将函数注册为指定名称的 loop 算法"""
    def decorator(fn: Callable) -> Callable:
        LOOP_REGISTRY[name] = fn
        return fn
    return decorator


def get_loop_algorithm(name: str) -> Callable | None:
    return LOOP_REGISTRY.get(name)
