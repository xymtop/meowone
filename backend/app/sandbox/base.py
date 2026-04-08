"""E2B 云端沙箱抽象基类."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ExecutionResult:
    """代码执行结果."""

    logs: List[str] = field(default_factory=list)
    error: Optional[str] = None
    results: List[Any] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""


@dataclass
class FileInfo:
    """文件信息."""

    name: str
    path: str
    is_dir: bool
    size: int = 0


class BaseSandbox(ABC):
    """沙箱抽象基类."""

    @abstractmethod
    async def run_code(self, code: str, timeout: int = 60) -> ExecutionResult:
        """在沙箱中执行代码."""
        pass

    @abstractmethod
    async def write_file(self, path: str, content: str) -> None:
        """写入文件."""
        pass

    @abstractmethod
    async def read_file(self, path: str) -> str:
        """读取文件."""
        pass

    @abstractmethod
    async def list_dir(self, path: str = "/") -> List[FileInfo]:
        """列出目录."""
        pass

    @abstractmethod
    async def run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """执行 shell 命令."""
        pass

    @abstractmethod
    async def close(self) -> None:
        """关闭沙箱."""
        pass
