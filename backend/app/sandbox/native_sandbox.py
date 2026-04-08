"""本地原生沙箱实现 - 在本地环境中执行代码."""
from __future__ import annotations

import logging
import subprocess
import tempfile
import os
import shutil
from typing import List, Optional, Dict, Any

from app.sandbox.base import BaseSandbox, ExecutionResult, FileInfo

logger = logging.getLogger(__name__)


class NativeSandboxImpl(BaseSandbox):
    """本地原生沙箱实现 - 在本地环境中执行代码.

    注意: 此实现安全性较低，仅用于开发/测试环境。
    生产环境请使用 Docker 或 E2B 沙箱。
    """

    def __init__(
        self,
        allowed_dirs: Optional[List[str]] = None,
        timeout: int = 60,
        resource_limits: Optional[Dict[str, Any]] = None,
    ):
        """
        初始化本地沙箱.

        Args:
            allowed_dirs: 允许访问的目录列表，None 表示允许临时目录
            timeout: 超时时间（秒）
            resource_limits: 资源限制配置
        """
        self._timeout = timeout
        self._resource_limits = resource_limits or {}
        self._allowed_dirs = allowed_dirs or [tempfile.gettempdir()]
        self._temp_files: List[str] = []

    async def run_code(self, code: str, timeout: int = 60) -> ExecutionResult:
        """在本地环境执行代码."""
        try:
            # 创建临时文件
            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=".py",
                delete=False,
                encoding="utf-8",
            ) as f:
                f.write(code)
                temp_path = f.name

            self._temp_files.append(temp_path)

            # 执行代码
            result = await self._run_python(temp_path, timeout)

            return result

        except Exception as e:
            logger.exception("本地沙箱执行失败")
            return ExecutionResult(error=str(e))

    async def write_file(self, path: str, content: str) -> None:
        """写入文件到沙箱."""
        # 安全检查：确保路径在允许的目录内
        if not self._is_safe_path(path):
            raise ValueError(f"路径不在允许范围内: {path}")

        os.makedirs(os.path.dirname(path), exist_ok=True)

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    async def read_file(self, path: str) -> str:
        """读取沙箱中的文件."""
        if not self._is_safe_path(path):
            raise ValueError(f"路径不在允许范围内: {path}")

        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    async def list_dir(self, path: str = "/") -> List[FileInfo]:
        """列出沙箱目录."""
        if not self._is_safe_path(path):
            raise ValueError(f"路径不在允许范围内: {path}")

        if not os.path.exists(path):
            return []

        files = []
        for name in os.listdir(path):
            full_path = os.path.join(path, name)
            try:
                stat = os.stat(full_path)
                files.append(FileInfo(
                    name=name,
                    path=full_path,
                    is_dir=os.path.isdir(full_path),
                    size=stat.st_size,
                ))
            except OSError:
                continue

        return files

    async def run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """在沙箱中执行 shell 命令."""
        try:
            result = await self._run_command(command, timeout)
            return result
        except Exception as e:
            logger.exception("命令执行失败")
            return ExecutionResult(error=str(e))

    async def close(self) -> None:
        """清理沙箱资源."""
        # 删除临时文件
        for temp_file in self._temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except OSError:
                pass

        self._temp_files.clear()

    def _is_safe_path(self, path: str) -> bool:
        """检查路径是否安全."""
        real_path = os.path.realpath(path)

        for allowed_dir in self._allowed_dirs:
            real_allowed = os.path.realpath(allowed_dir)
            if real_path.startswith(real_allowed):
                return True

        return False

    async def _run_python(self, script_path: str, timeout: int) -> ExecutionResult:
        """运行 Python 脚本."""
        timeout = min(timeout, self._timeout)

        try:
            result = await self._run_command(
                f"python3 {script_path}",
                timeout,
            )
            return result

        except Exception as e:
            return ExecutionResult(error=str(e))

    async def _run_command(self, command: str, timeout: int) -> ExecutionResult:
        """执行 shell 命令."""
        try:
            proc = await self._async_run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            return ExecutionResult(
                stdout=proc.stdout or "",
                stderr=proc.stderr or "",
                error=None if proc.returncode == 0 else f"Exit code: {proc.returncode}",
            )

        except subprocess.TimeoutExpired:
            return ExecutionResult(
                error=f"Command timed out after {timeout} seconds",
            )
        except Exception as e:
            return ExecutionResult(
                error=str(e),
            )

    async def _async_run(self, *args, **kwargs) -> subprocess.CompletedProcess:
        """异步运行命令."""
        import asyncio

        loop = asyncio.get_event_loop()
        process = await loop.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=kwargs.get("timeout", 30),
            )
        except asyncio.TimeoutError:
            process.kill()
            raise subprocess.TimeoutExpired(args[0], kwargs.get("timeout", 30))

        return subprocess.CompletedProcess(
            args=args,
            returncode=process.returncode,
            stdout=stdout.decode("utf-8", errors="replace") if stdout else "",
            stderr=stderr.decode("utf-8", errors="replace") if stderr else "",
        )