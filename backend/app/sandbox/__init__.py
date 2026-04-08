"""Sandbox 模块 - 提供隔离的代码执行环境."""
from __future__ import annotations

from app.sandbox.base import BaseSandbox, ExecutionResult, FileInfo
from app.sandbox.e2b_sandbox import E2BSandboxImpl, E2B_AVAILABLE
from app.sandbox.native_sandbox import NativeSandboxImpl
from app.sandbox.docker_sandbox import DockerSandboxImpl
from app.sandbox.manager import (
    SandboxManager,
    get_sandbox_manager,
    create_sandbox_from_environment,
)

__all__ = [
    "BaseSandbox",
    "ExecutionResult",
    "FileInfo",
    "E2BSandboxImpl",
    "E2B_AVAILABLE",
    "NativeSandboxImpl",
    "DockerSandboxImpl",
    "SandboxManager",
    "get_sandbox_manager",
    "create_sandbox_from_environment",
]
