"""Sandbox 模块 - 提供隔离的代码执行环境."""
from __future__ import annotations

from app.sandbox.base import BaseSandbox, ExecutionResult, FileInfo
from app.sandbox.e2b_sandbox import E2BSandboxImpl, E2B_AVAILABLE

__all__ = [
    "BaseSandbox",
    "ExecutionResult",
    "FileInfo",
    "E2BSandboxImpl",
    "E2B_AVAILABLE",
]
