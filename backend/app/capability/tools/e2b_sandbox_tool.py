"""E2B 云端沙箱工具 (Capability)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.capability.tool_base import BaseTool, ToolExecutionResult
from app.config import E2B_TIMEOUT_SECONDS
from app.sandbox.base import ExecutionResult
from app.sandbox.e2b_sandbox import E2BSandboxImpl, E2B_AVAILABLE
from app.services.v3_service import get_environment_by_id

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
            "environment_id": {
                "type": "string",
                "description": "执行环境 ID（用于从数据库配置获取 API Key）",
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
        self._sandbox_per_env: Dict[str, E2BSandboxImpl] = {}

    async def _get_sandbox(self, env_id: Optional[str] = None) -> E2BSandboxImpl:
        """
        获取或创建沙箱实例.

        Args:
            env_id: 可选的 Environment ID，用于从数据库获取 API Key

        Returns:
            E2BSandboxImpl: 沙箱实例
        """
        if not E2B_AVAILABLE:
            raise ImportError(
                "E2B SDK 未安装，请运行: pip install e2b-code-interpreter"
            )

        api_key = ""

        # 优先从数据库配置获取 API Key
        if env_id:
            try:
                env_config = await get_environment_by_id(env_id)
                if env_config and env_config.get("api_key"):
                    api_key = env_config["api_key"]
                    logger.info("从 Environment %s 获取到 E2B API Key", env_id)
            except Exception as e:
                logger.warning("从 Environment %s 获取 API Key 失败: %s", env_id, e)

        # 如果没有从数据库获取到，使用环境变量
        if not api_key:
            from app.config import E2B_API_KEY
            api_key = E2B_API_KEY

        if not api_key:
            raise ValueError("请在执行环境配置中设置 E2B API Key 或设置环境变量 E2B_API_KEY")

        # 按 Environment ID 缓存沙箱实例
        if env_id:
            if env_id not in self._sandbox_per_env:
                self._sandbox_per_env[env_id] = E2BSandboxImpl(
                    api_key=api_key,
                    metadata={"environment_id": env_id}
                )
            return self._sandbox_per_env[env_id]

        # 共享沙箱
        if self._sandbox is None:
            self._sandbox = E2BSandboxImpl(api_key=api_key)
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

        # 可选：从 params 中提取 environment_id 以支持多租户隔离
        env_id = params.get("environment_id")

        try:
            sandbox = await self._get_sandbox(env_id)

            if action == "run_code":
                code = params.get("code", "")
                if not code:
                    return ToolExecutionResult(payload="缺少 code 参数")

                result = await sandbox.run_code(code, timeout=timeout)
                return self._format_result(result)

            elif action == "write_file":
                file_path = params.get("file_path", "")
                file_content = params.get("file_content", "")
                if not file_path:
                    return ToolExecutionResult(payload="缺少 file_path 参数")

                await sandbox.write_file(file_path, file_content)
                return ToolExecutionResult(payload=f"文件已写入: {file_path}")

            elif action == "read_file":
                file_path = params.get("file_path", "")
                if not file_path:
                    return ToolExecutionResult(payload="缺少 file_path 参数")

                content = await sandbox.read_file(file_path)
                return ToolExecutionResult(payload=content)

            elif action == "list_dir":
                dir_path = params.get("dir_path", "/")
                files = await sandbox.list_dir(dir_path)

                file_list = "\n".join(
                    f"{'[DIR] ' if f.is_dir else '[FILE]'} {f.name} ({f.size} bytes)"
                    for f in files
                )
                return ToolExecutionResult(payload=f"目录 {dir_path}:\n{file_list or '(空目录)'}")

            elif action == "run_command":
                command = params.get("command", "")
                if not command:
                    return ToolExecutionResult(payload="缺少 command 参数")

                result = await sandbox.run_command(command, timeout=timeout)
                return self._format_result(result)

            else:
                return ToolExecutionResult(
                    payload=f"未知的 action: {action}，支持的 action: run_code, write_file, read_file, list_dir, run_command"
                )

        except ImportError as e:
            logger.error("E2B SDK 导入失败: %s", e)
            return ToolExecutionResult(
                payload=f"E2B SDK 未安装或配置错误: {e}\n请运行: pip install e2b-code-interpreter"
            )

        except ValueError as e:
            logger.error("E2B 配置错误: %s", e)
            return ToolExecutionResult(payload=str(e))

        except Exception as e:
            logger.exception("E2B 沙箱执行失败")
            return ToolExecutionResult(payload=f"执行失败: {e}")

    def _format_result(self, result: ExecutionResult) -> ToolExecutionResult:
        """格式化执行结果."""
        if result.error:
            return ToolExecutionResult(payload=result.error)

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

        return ToolExecutionResult(payload=output)

    async def close(self) -> None:
        """关闭所有沙箱实例."""
        if self._sandbox:
            await self._sandbox.close()
            self._sandbox = None

        for sandbox in self._sandbox_per_env.values():
            await sandbox.close()
        self._sandbox_per_env.clear()
