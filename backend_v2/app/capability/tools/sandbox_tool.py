"""统一沙盒工具 - 根据环境配置选择合适的沙盒后端."""
from __future__ import annotations

import logging
import json
from typing import Any, Dict, Optional

from app.capability.tool_base import BaseTool, ToolExecutionResult
from app.sandbox.manager import get_sandbox_manager, SandboxManager
from app.services.services.v3_service import get_environment_by_id

logger = logging.getLogger(__name__)


class SandboxTool(BaseTool):
    """统一沙盒工具 - 根据环境配置自动选择合适的沙盒后端.

    支持三种沙盒类型:
    - native: 本地原生沙箱（开发/测试用）
    - docker: Docker 容器沙箱（生产推荐）
    - e2b: E2B 云端沙箱（需要 API Key）

    用户可以通过 environment_id 参数指定执行环境，
    或者通过 action 参数中的配置指定沙盒类型。
    """

    name = "sandbox"
    display_name = "Sandbox Executor"
    description = (
        "在隔离的沙箱环境中执行 Python 代码或命令。\n"
        "支持三种沙盒类型：native（本地）、docker（容器）、e2b（云端）。\n"
        "通过 environment_id 指定执行环境，系统会自动选择合适的沙盒后端。"
    )
    permission = "sensitive"
    category = "sandbox"
    tags = ("python", "sandbox", "code-execution", "docker", "e2b")

    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["run_code", "write_file", "read_file", "list_dir", "run_command", "get_info"],
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
                "description": "执行环境 ID（用于从数据库配置获取沙盒类型和 API Key）",
            },
            "sandbox_type": {
                "type": "string",
                "enum": ["native", "docker", "e2b"],
                "description": "沙盒类型（可选，优先使用 environment_id）",
            },
            "sandbox_config": {
                "type": "object",
                "description": "沙盒配置（可选）",
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
        self._manager = get_sandbox_manager()
        self._current_sandbox_type: Optional[str] = None
        self._current_sandbox: Optional[Any] = None

    async def _get_sandbox(
        self,
        environment_id: Optional[str] = None,
        sandbox_type: Optional[str] = None,
        sandbox_config: Optional[Dict[str, Any]] = None,
    ) -> Optional[Any]:
        """
        获取或创建沙箱实例.

        Args:
            environment_id: 环境 ID，从数据库获取配置
            sandbox_type: 沙盒类型
            sandbox_config: 沙盒配置

        Returns:
            沙箱实例
        """
        sandbox_config = sandbox_config or {}

        # 1. 优先从 environment_id 获取配置
        if environment_id:
            try:
                env_config = await get_environment_by_id(environment_id)
                if env_config:
                    # 获取沙盒类型
                    env_sandbox_type = env_config.get("sandbox_type", "native")
                    self._current_sandbox_type = env_sandbox_type

                    # 合并配置
                    sandbox_config = {
                        **env_config.get("sandbox_config_json", {}),
                        **sandbox_config,
                        "api_key": env_config.get("api_key"),
                    }

                    # 如果指定了 sandbox_type，优先使用
                    if sandbox_type:
                        self._current_sandbox_type = sandbox_type

                    sandbox = self._manager.create_sandbox(
                        self._current_sandbox_type,
                        sandbox_config,
                        environment_id,
                    )
                    if sandbox:
                        self._current_sandbox = sandbox
                        return sandbox

            except Exception as e:
                logger.warning(f"从 Environment {environment_id} 获取配置失败: {e}")

        # 2. 使用传入的 sandbox_type
        if sandbox_type:
            self._current_sandbox_type = sandbox_type
            sandbox = self._manager.create_sandbox(sandbox_type, sandbox_config)
            if sandbox:
                self._current_sandbox = sandbox
                return sandbox

        # 3. 默认使用 native
        self._current_sandbox_type = "native"
        sandbox = self._manager.create_sandbox("native", sandbox_config)
        if sandbox:
            self._current_sandbox = sandbox
        return sandbox

    async def execute(self, params: Dict[str, Any]) -> ToolExecutionResult:
        """
        执行沙盒操作.

        Args:
            params: 参数字典

        Returns:
            ToolExecutionResult: 执行结果
        """
        action = params.get("action")
        timeout = params.get("timeout", 60)
        environment_id = params.get("environment_id")
        sandbox_type = params.get("sandbox_type")
        sandbox_config = params.get("sandbox_config")

        # 获取沙箱实例
        sandbox = await self._get_sandbox(environment_id, sandbox_type, sandbox_config)

        if not sandbox:
            return ToolExecutionResult(
                payload=f"无法创建沙箱。sandbox_type={sandbox_type or 'not specified'}, environment_id={environment_id or 'not specified'}"
            )

        try:
            if action == "get_info":
                return self._get_sandbox_info()

            elif action == "run_code":
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
                return ToolExecutionResult(
                    payload=f"目录 {dir_path}:\n{file_list or '(空目录)'}"
                )

            elif action == "run_command":
                command = params.get("command", "")
                if not command:
                    return ToolExecutionResult(payload="缺少 command 参数")
                result = await sandbox.run_command(command, timeout=timeout)
                return self._format_result(result)

            else:
                return ToolExecutionResult(
                    payload=f"未知的 action: {action}，支持的 action: run_code, write_file, read_file, list_dir, run_command, get_info"
                )

        except NotImplementedError as e:
            return ToolExecutionResult(payload=f"当前沙盒类型不支持此操作: {e}")
        except Exception as e:
            logger.exception("沙箱执行失败")
            return ToolExecutionResult(payload=f"执行失败: {e}")

    def _format_result(self, result: Any) -> ToolExecutionResult:
        """格式化执行结果."""
        from app.sandbox.base import ExecutionResult

        if not isinstance(result, ExecutionResult):
            return ToolExecutionResult(payload=str(result))

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

    def _get_sandbox_info(self) -> ToolExecutionResult:
        """获取当前沙箱信息."""
        info = {
            "sandbox_type": self._current_sandbox_type or "unknown",
            "available_types": ["native", "docker", "e2b"],
        }

        if self._current_sandbox_type == "e2b":
            info["note"] = "需要配置 E2B_API_KEY 或在执行环境中设置"
        elif self._current_sandbox_type == "docker":
            info["note"] = "需要 Docker 服务运行中"
        elif self._current_sandbox_type == "native":
            info["note"] = "本地沙箱，仅用于开发/测试"

        return ToolExecutionResult(payload=json.dumps(info, ensure_ascii=False, indent=2))

    async def close(self) -> None:
        """关闭沙箱实例."""
        if self._current_sandbox:
            try:
                await self._current_sandbox.close()
            except Exception:
                pass
            self._current_sandbox = None
