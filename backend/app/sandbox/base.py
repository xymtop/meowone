"""
沙箱基类模块

定义沙箱的抽象基类和通用数据结构。
支持多种沙箱实现（本地、Docker、E2B）。
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ExecutionResult:
    """代码执行结果

    包含代码执行后的输出信息。
    
    Attributes:
        logs: 日志信息列表
        error: 错误信息（如果有）
        results: 执行结果列表
        stdout: 标准输出
        stderr: 标准错误输出
    """
    logs: List[str] = field(default_factory=list)
    error: Optional[str] = None
    results: List[Any] = field(default_factory=list)
    stdout: str = ""
    stderr: str = ""


@dataclass
class FileInfo:
    """文件信息

    描述沙箱中文件或目录的元数据。
    
    Attributes:
        name: 文件名
        path: 文件路径
        is_dir: 是否为目录
        size: 文件大小（字节）
    """
    name: str
    path: str
    is_dir: bool
    size: int = 0


class BaseSandbox(ABC):
    """沙箱抽象基类

    定义沙箱必须实现的方法。
    支持代码执行、文件操作、目录列表、命令执行等功能。
    """

    @abstractmethod
    async def run_code(self, code: str, timeout: int = 60) -> ExecutionResult:
        """在沙箱中执行代码
        
        Args:
            code: 要执行的代码
            timeout: 超时时间（秒）
        
        Returns:
            ExecutionResult: 执行结果
        """
        pass

    @abstractmethod
    async def write_file(self, path: str, content: str) -> None:
        """写入文件
        
        Args:
            path: 文件路径
            content: 文件内容
        """
        pass

    @abstractmethod
    async def read_file(self, path: str) -> str:
        """读取文件
        
        Args:
            path: 文件路径
        
        Returns:
            文件内容
        """
        pass

    @abstractmethod
    async def list_dir(self, path: str = "/") -> List[FileInfo]:
        """列出目录
        
        Args:
            path: 目录路径
        
        Returns:
            文件信息列表
        """
        pass

    @abstractmethod
    async def run_command(self, command: str, timeout: int = 30) -> ExecutionResult:
        """执行 shell 命令
        
        Args:
            command: shell 命令
            timeout: 超时时间（秒）
        
        Returns:
            ExecutionResult: 执行结果
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """关闭沙箱
        
        清理沙箱占用的资源。
        """
        pass
