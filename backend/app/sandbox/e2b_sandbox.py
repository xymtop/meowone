"""E2B 云端沙箱实现."""
from __future__ import annotations

import os
from typing import List, Optional

from app.sandbox.base import BaseSandbox, ExecutionResult, FileInfo

try:
    from e2b_code_interpreter import Sandbox as E2BSandbox
    from e2b_code_interpreter.models import File as E2BFile

    E2B_AVAILABLE = True
except ImportError:
    E2B_AVAILABLE = False


class E2BSandboxImpl(BaseSandbox):
    """E2B 云端沙箱实现."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        template: Optional[str] = None,
        timeout: int = 120,
        metadata: Optional[Dict] = None,
    ):
        """
        初始化 E2B 沙箱.

        Args:
            api_key: E2B API Key（优先使用，None 时从环境变量读取）
            template: 沙箱模板，默认为 Python 3.11 环境
            timeout: 沙箱超时时间（秒）
            metadata: 元数据，用于追踪
        """
        if not E2B_AVAILABLE:
            raise ImportError(
                "E2B SDK 未安装，请运行: pip install e2b-code-interpreter"
            )

        self._api_key = api_key or os.environ.get("E2B_API_KEY", "")
        if not self._api_key:
            raise ValueError("请设置环境变量 E2B_API_KEY 或传入 api_key 参数")

        self._template = template
        self._timeout = timeout
        self._metadata = metadata or {}
        self._sandbox: Optional[E2BSandbox] = None

    async def _ensure_sandbox(self) -> E2BSandbox:
        """确保沙箱已创建（懒加载）."""
        if self._sandbox is None:
            self._sandbox = E2BSandbox(
                api_key=self._api_key,
                template=self._template,
                timeout=self._timeout,
                metadata=self._metadata,
            )
        return self._sandbox

    async def run_code(self, code: str, timeout: int = 60) -> ExecutionResult:
        """
        在 E2B 沙箱中执行 Python 代码.

        Args:
            code: 要执行的 Python 代码
            timeout: 超时时间（秒）

        Returns:
            ExecutionResult: 执行结果
        """
        sandbox = await self._ensure_sandbox()

        try:
            execution = sandbox.run_code(
                code,
                timeout=timeout,
            )

            return ExecutionResult(
                logs=execution.logs if hasattr(execution, "logs") else [],
                error=execution.error if hasattr(execution, "error") else None,
                results=execution.results if hasattr(execution, "results") else [],
                stdout=execution.stdout if hasattr(execution, "stdout") else "",
                stderr=execution.stderr if hasattr(execution, "stderr") else "",
            )
        except Exception as e:
            return ExecutionResult(
                error=str(e),
            )

    async def write_file(self, path: str, content: str) -> None:
        """写入文件到沙箱."""
        sandbox = await self._ensure_sandbox()
        sandbox.files.write(path, content)

    async def read_file(self, path: str) -> str:
        """读取沙箱中的文件."""
        sandbox = await self._ensure_sandbox()
        return sandbox.files.read(path)

    async def list_dir(self, path: str = "/") -> List[FileInfo]:
        """列出沙箱目录."""
        sandbox = await self._ensure_sandbox()
        files = sandbox.files.list(path)

        return [
            FileInfo(
                name=f.name,
                path=f.path,
                is_dir=f.is_dir if hasattr(f, "is_dir") else False,
                size=f.size if hasattr(f, "size") else 0,
            )
            for f in files
        ]

    async def run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """
        在 E2B 沙箱中执行 shell 命令.

        Args:
            command: shell 命令
            timeout: 超时时间（秒）

        Returns:
            ExecutionResult: 执行结果
        """
        sandbox = await self._ensure_sandbox()

        try:
            result = sandbox.process.run(
                command,
                timeout=timeout,
            )

            return ExecutionResult(
                stdout=result.stdout if hasattr(result, "stdout") else "",
                stderr=result.stderr if hasattr(result, "stderr") else "",
                error=result.error if hasattr(result, "error") else None,
            )
        except Exception as e:
            return ExecutionResult(
                error=str(e),
            )

    async def close(self) -> None:
        """关闭 E2B 沙箱."""
        if self._sandbox is not None:
            self._sandbox.kill()
            self._sandbox = None
