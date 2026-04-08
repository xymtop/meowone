"""Docker 容器沙箱实现 - 在 Docker 容器中执行代码."""
from __future__ import annotations

import logging
import subprocess
import tempfile
import os
import uuid
import asyncio
from typing import List, Optional, Dict, Any

from app.sandbox.base import BaseSandbox, ExecutionResult, FileInfo

logger = logging.getLogger(__name__)


class DockerSandboxImpl(BaseSandbox):
    """Docker 容器沙箱实现 - 在隔离的 Docker 容器中执行代码.

    此实现使用 Docker 容器提供隔离的代码执行环境。
    需要系统已安装 Docker 并且当前用户有权限运行 docker 命令。
    """

    def __init__(
        self,
        image: str = "python:3.11-slim",
        timeout: int = 120,
        resource_limits: Optional[Dict[str, Any]] = None,
        container_name_prefix: str = "meowone_sandbox_",
    ):
        """
        初始化 Docker 沙箱.

        Args:
            image: Docker 镜像，默认为 Python 3.11 slim 镜像
            timeout: 超时时间（秒）
            resource_limits: 资源限制配置（memory, cpu 等）
            container_name_prefix: 容器名称前缀
        """
        self._image = image
        self._timeout = timeout
        self._resource_limits = resource_limits or {}
        self._container_name_prefix = container_name_prefix
        self._container_id: Optional[str] = None
        self._container_name: Optional[str] = None

    async def run_code(self, code: str, timeout: int = 60) -> ExecutionResult:
        """在 Docker 容器中执行 Python 代码."""
        if not await self._ensure_container():
            return ExecutionResult(error="Failed to start Docker container")

        try:
            # 创建临时文件
            temp_file = f"/tmp/sandbox_{uuid.uuid4().hex[:8]}.py"
            result = await self._exec_in_container(f"echo '{code.replace(chr(39), chr(39)+chr(39)+chr(39))}' > {temp_file}")

            if result.error:
                return result

            # 执行代码
            result = await self._exec_in_container(
                f"timeout {timeout} python3 {temp_file}",
                timeout=timeout,
            )

            # 清理临时文件
            await self._exec_in_container(f"rm -f {temp_file}")

            return result

        except Exception as e:
            logger.exception("Docker 沙箱执行失败")
            return ExecutionResult(error=str(e))

    async def write_file(self, path: str, content: str) -> None:
        """写入文件到沙箱容器."""
        if not self._container_id:
            raise RuntimeError("Container not running")

        # 将内容写入临时文件
        import base64
        encoded = base64.b64encode(content.encode("utf-8")).decode("ascii")

        # 使用 docker exec 写入文件
        cmd = f'echo "{encoded}" | base64 -d > {path}'
        result = await self._exec_in_container(cmd)

        if result.error:
            raise RuntimeError(f"Failed to write file: {result.error}")

    async def read_file(self, path: str) -> str:
        """读取沙箱中的文件."""
        if not self._container_id:
            raise RuntimeError("Container not running")

        # 使用 docker exec 读取文件
        result = await self._exec_in_container(f"cat {path}")

        if result.error:
            raise RuntimeError(f"Failed to read file: {result.error}")

        return result.stdout

    async def list_dir(self, path: str = "/") -> List[FileInfo]:
        """列出沙箱目录."""
        if not self._container_id:
            return []

        result = await self._exec_in_container(f"ls -la {path}")

        if result.error:
            return []

        files = []
        lines = result.stdout.strip().split("\n")

        for line in lines[1:]:  # 跳过 total 行
            parts = line.split()
            if len(parts) >= 8:
                permissions = parts[0]
                is_dir = permissions.startswith("d")
                name = " ".join(parts[8:])
                full_path = os.path.join(path, name)

                try:
                    files.append(FileInfo(
                        name=name,
                        path=full_path,
                        is_dir=is_dir,
                        size=0,  # Docker ls 不直接显示大小
                    ))
                except Exception:
                    continue

        return files

    async def run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """在沙箱中执行 shell 命令."""
        if not await self._ensure_container():
            return ExecutionResult(error="Container not running")

        return await self._exec_in_container(command, timeout=timeout)

    async def close(self) -> None:
        """停止并删除容器."""
        if self._container_id:
            try:
                await self._run_docker(["rm", "-f", self._container_id])
            except Exception as e:
                logger.warning(f"Failed to remove container: {e}")

            self._container_id = None
            self._container_name = None

    async def _ensure_container(self) -> bool:
        """确保容器正在运行."""
        if self._container_id:
            # 检查容器是否还在运行
            result = await self._run_docker(["ps", "-q", "--filter", f"id={self._container_id}"])
            if result.stdout.strip():
                return True

        # 启动新容器
        container_name = f"{self._container_name_prefix}{uuid.uuid4().hex[:8]}"

        # 构建资源限制参数
        memory_limit = self._resource_limits.get("memory", "512m")
        cpu_limit = self._resource_limits.get("cpu", "1.0")

        cmd = [
            "docker", "run",
            "-d",
            "--name", container_name,
            "--network", "none",  # 禁用网络
            "--memory", memory_limit,
            "--cpus", str(cpu_limit),
            "--read-only",  # 根文件系统只读
            "--tmpfs", "/tmp:rw,noexec,size=256m",  # 可写临时目录
            "-w", "/workspace",
            self._image,
            "sleep", "3600",  # 保持容器运行
        ]

        result = await self._run_docker(cmd)

        if result.error:
            logger.error(f"Failed to start container: {result.error}")
            return False

        self._container_id = result.stdout.strip()
        self._container_name = container_name

        # 等待容器启动
        await asyncio.sleep(0.5)

        return True

    async def _exec_in_container(
        self,
        command: str,
        timeout: int = 30,
    ) -> ExecutionResult:
        """在容器中执行命令."""
        if not self._container_id:
            return ExecutionResult(error="Container not running")

        cmd = [
            "docker", "exec",
            self._container_id,
            "sh", "-c", command,
        ]

        return await self._run_docker_with_timeout(cmd, timeout)

    async def _run_docker(self, cmd: List[str]) -> ExecutionResult:
        """运行 docker 命令."""
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await proc.communicate()

            return ExecutionResult(
                stdout=stdout.decode("utf-8", errors="replace") if stdout else "",
                stderr=stderr.decode("utf-8", errors="replace") if stderr else "",
                error=None if proc.returncode == 0 else f"Exit code: {proc.returncode}",
            )

        except Exception as e:
            return ExecutionResult(error=str(e))

    async def _run_docker_with_timeout(
        self,
        cmd: List[str],
        timeout: int,
    ) -> ExecutionResult:
        """运行 docker 命令并设置超时."""
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return ExecutionResult(error=f"Command timed out after {timeout} seconds")

            return ExecutionResult(
                stdout=stdout.decode("utf-8", errors="replace") if stdout else "",
                stderr=stderr.decode("utf-8", errors="replace") if stderr else "",
                error=None if proc.returncode == 0 else f"Exit code: {proc.returncode}",
            )

        except Exception as e:
            return ExecutionResult(error=str(e))