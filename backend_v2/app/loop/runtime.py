"""
Loop 运行时核心模块

定义 Loop 相关的常量和类型，供其他模块引用。
"""
from __future__ import annotations

SUPPORTED_LOOP_MODES = frozenset(["react", "plan_exec"])
DEFAULT_LOOP_MODE = "react"
