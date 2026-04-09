"""
Loop 调度引擎

根据 ctx.loop_mode 从注册表中路由到对应的算法函数。
所有算法模块必须在应用启动时被导入以完成注册。
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

from app.loop.context import LoopContext
from app.loop.events import ErrorEvent, DoneEvent, LoopEvent
from app.loop.registry import get_loop_algorithm

logger = logging.getLogger(__name__)

DEFAULT_LOOP_MODE = "react"


async def run_loop(ctx: LoopContext) -> AsyncIterator[LoopEvent]:
    """
    Loop 引擎入口

    根据 ctx.loop_mode 找到对应算法并执行。
    若找不到则 fallback 到 react。
    """
    mode = ctx.loop_mode or DEFAULT_LOOP_MODE
    fn = get_loop_algorithm(mode)

    if fn is None:
        logger.warning("未找到 loop 算法: %s，fallback 到 react", mode)
        fn = get_loop_algorithm(DEFAULT_LOOP_MODE)

    if fn is None:
        yield ErrorEvent(code="NO_LOOP_ALGORITHM", message=f"No loop algorithm registered for: {mode}")
        yield DoneEvent(message_id=ctx.message_id, loop_rounds=0, total_duration=0)
        return

    async for event in fn(ctx):
        yield event


def import_all_algorithms() -> None:
    """导入所有算法模块以触发 @loop_algorithm 注册"""
    import app.loop.algorithms.react  # noqa: F401
    import app.loop.algorithms.plan_exec  # noqa: F401
