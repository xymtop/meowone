"""E2B 云端沙箱工具 (Capability)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.capability.tool_base import BaseTool, ToolExecutionResult
from app.config import E2B_API_KEY, E2B_TIMEOUT_SECONDS
from app.sandbox.base import ExecutionResult
from app.sandbox.e2b_sandbox import E2BSandboxImpl, E2B_AVAILABLE

logger = logging.getLogger(__name__)


class E2BSandboxTool(BaseTool):
    """E2B 云端沙箱工具，用于在隔离环境中执行 Python 代码."""

    name = "e2b_sandbox"
    display_name = "Python Sandbox (E2B)"
    description = (
        "在云端隔离的 Python 环境中执行 Python 代码。 "
        "支持文件操作、命令执行和代码执行。 "
        "适合需要安全执行不可信代码或独立的 Python 运行环境。"
    )
    permission = "sensitive"
    category = "sandbox"
    tags = ("python", "sandbox", "e2b", "code-execution")

    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["run_code", "write_file", "read_file", "list_dir", "run_command"],
                "description": "执行的操作类型",
            },
            "code": {
                "type": "string",
                "description": "要执行的 Python 代码（action=run_code 时必填）",
            },
            "file_path": {
                "type": "string",
                "description": "文件路径（action 为 write_file/read_file 时必填）",
            },
            "file_content": {
                "type": "string",
                "description": "文件内容（action=write_file 时必填）",
            },
            "dir_path": {
                "type": "string",
                "description": "目录路径（action=list_dir 时使用，默认为 /）",
            },
            "command": {
                "type": "string",
                "description": "shell 命令（action=run_command 时必填）",
            },
            "timeout": {
                "type": "integer",
                "description": "超时时间（秒），默认 60",
            },
        },
        "required": ["action"],
        "dependencies": {
            "code": ["run_code"],
            "file_path": ["write_file", "read_file"],
            "file_content": ["write_file"],
            "command": ["run_command"],
        },
    }

    def __init__(self):
        super().__init__()
        self._sandbox: Optional[E2BSandboxImpl] = None
        self._sandbox_per_agent: Dict[str, E2BSandboxImpl] = {}

    async def _get_sandbox(self, agent_id: Optional[str] = None) -> E2BSandboxImpl:
        """
        获取或创建沙箱实例.

        Args:
            agent_id: 可选的 Agent ID，用于为每个 Agent 创建独立沙箱

        Returns:
            E2BSandboxImpl: 沙箱实例
        """
        if not E2B_AVAILABLE:
            raise ImportError(
                "E2B SDK 未安装，请运行: pip install e2b-code-interpreter"
            )

        if not E2B_API_KEY:
            raise ValueError("请设置环境变量 E2B_API_KEY")

        # 如果提供了 agent_id，为每个 Agent 创建独立沙箱
        if agent_id:
            if agent_id not in self._sandbox_per_agent:
                self._sandbox_per_agent[agent_id] = E2BSandboxImpl(
                    metadata={"agent_id": agent_id}
                )
            return self._sandbox_per_agent[agent_id]

        # 共享沙箱
        if self._sandbox is None:
            self._sandbox = E2BSandboxImpl()
        return self._sandbox

    async def execute(self, params: Dict[str, Any]) -> ToolExecutionResult:
        """
        执行 E2B 沙箱操作.

        Args:
            params: 参数字典

        Returns:
            ToolExecutionResult: 执行结果
        """
        action = params.get("action")
        timeout = params.get("timeout", E2B_TIMEOUT_SECONDS)

        # 可选：从 params 中提取 agent_id 以支持多租户隔离
        agent_id = params.get("agent_id")

        try:
            sandbox = await self._get_sandbox(agent_id)

            if action == "run_code":
                code = params.get("code", "")
                if not code:
                    return ToolExecutionResult(error="缺少 code 参数")

                result = await sandbox.run_code(code, timeout=timeout)
                return self._format_result(result)

            elif action == "write_file":
                file_path = params.get("file_path", "")
                file_content = params.get("file_content", "")
                if not file_path:
                    return ToolExecutionResult(error="缺少 file_path 参数")

                await sandbox.write_file(file_path, file_content)
                return ToolExecutionResult(result=f"文件已写入: {file_path}")

            elif action == "read_file":
                file_path = params.get("file_path", "")
                if not file_path:
                    return ToolExecutionResult(error="缺少 file_path 参数")

                content = await sandbox.read_file(file_path)
                return ToolExecutionResult(result=content)

            elif action == "list_dir":
                dir_path = params.get("dir_path", "/")
                files = await sandbox.list_dir(dir_path)

                file_list = "\n".join(
                    f"{'[DIR] ' if f.is_dir else '[FILE]'} {f.name} ({f.size} bytes)"
                    for f in files
                )
                return ToolExecutionResult(result=f"目录 {dir_path}:\n{file_list or '(空目录)'}")

            elif action == "run_command":
                command = params.get("command", "")
                if not command:
                    return ToolExecutionResult(error="缺少 command 参数")

                result = await sandbox.run_command(command, timeout=timeout)
                return self._format_result(result)

            else:
                return ToolExecutionResult(
                    error=f"未知的 action: {action}，支持的 action: run_code, write_file, read_file, list_dir, run_command"
                )

        except ImportError as e:
            logger.error("E2B SDK 导入失败: %s", e)
            return ToolExecutionResult(
                error=f"E2B SDK 未安装或配置错误: {e}\n请运行: pip install e2b-code-interpreter"
            )

        except ValueError as e:
            logger.error("E2B 配置错误: %s", e)
            return ToolExecutionResult(error=str(e))

        except Exception as e:
            logger.exception("E2B 沙箱执行失败")
            return ToolExecutionResult(error=f"执行失败: {e}")

    def _format_result(self, result: ExecutionResult) -> ToolExecutionResult:
        """格式化执行结果."""
        if result.error:
            return ToolExecutionResult(error=result.error)

        output_parts = []

        if result.logs:
            output_parts.append("\n".join(str(log) for log in result.logs))

        if result.stdout:
            output_parts.append(result.stdout)

        if result.stderr:
            output_parts.append(f"[stderr]\n{result.stderr}")

        if result.results:
            output_parts.append(
                "\n".join(f"[result] {r}" for r in result.results)
            )

        output = "\n".join(output_parts) if output_parts else "(无输出)"

        return ToolExecutionResult(result=output)

    async def close(self) -> None:
        """关闭所有沙箱实例."""
        if self._sandbox:
            await self._sandbox.close()
            self._sandbox = None

        for sandbox in self._sandbox_per_agent.values():
            await sandbox.close()
        self._sandbox_per_agent.clear()
