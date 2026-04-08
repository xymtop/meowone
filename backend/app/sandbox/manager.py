"""沙箱管理器 - 根据配置创建和管理不同类型的沙箱."""
from __future__ import annotations

import logging
from typing import Optional, Dict, Any

from app.sandbox.base import BaseSandbox, ExecutionResult
from app.sandbox.e2b_sandbox import E2BSandboxImpl, E2B_AVAILABLE
from app.sandbox.native_sandbox import NativeSandboxImpl
from app.sandbox.docker_sandbox import DockerSandboxImpl

logger = logging.getLogger(__name__)


class SandboxManager:
    """沙箱管理器 - 根据配置创建和管理不同类型的沙箱."""

    SANDBOX_TYPE_NATIVE = "native"
    SANDBOX_TYPE_DOCKER = "docker"
    SANDBOX_TYPE_E2B = "e2b"

    def __init__(self):
        self._sandboxes: Dict[str, BaseSandbox] = {}
        self._sandbox_configs: Dict[str, Dict[str, Any]] = {}

    def create_sandbox(
        self,
        sandbox_type: str,
        config: Optional[Dict[str, Any]] = None,
        env_id: Optional[str] = None,
    ) -> Optional[BaseSandbox]:
        """
        根据沙箱类型创建沙箱实例.

        Args:
            sandbox_type: 沙箱类型 (native, docker, e2b)
            config: 沙箱配置
            env_id: 环境 ID，用于缓存和区分

        Returns:
            沙箱实例，如果类型不支持或配置无效则返回 None
        """
        config = config or {}

        if env_id and env_id in self._sandboxes:
            return self._sandboxes[env_id]

        try:
            sandbox: Optional[BaseSandbox] = None

            if sandbox_type == self.SANDBOX_TYPE_NATIVE:
                sandbox = NativeSandboxImpl(
                    allowed_dirs=config.get("allowed_dirs"),
                    timeout=config.get("timeout", 60),
                    resource_limits=config.get("resource_limits"),
                )

            elif sandbox_type == self.SANDBOX_TYPE_DOCKER:
                sandbox = DockerSandboxImpl(
                    image=config.get("image", "python:3.11-slim"),
                    timeout=config.get("timeout", 120),
                    resource_limits=config.get("resource_limits"),
                )

            elif sandbox_type == self.SANDBOX_TYPE_E2B:
                if not E2B_AVAILABLE:
                    logger.error("E2B SDK 未安装，无法创建 E2B 沙箱")
                    return None

                sandbox = E2BSandboxImpl(
                    api_key=config.get("api_key"),
                    template=config.get("template"),
                    timeout=config.get("timeout", 120),
                    metadata={"environment_id": env_id} if env_id else None,
                )

            else:
                logger.warning(f"Unknown sandbox type: {sandbox_type}")
                return None

            if sandbox and env_id:
                self._sandboxes[env_id] = sandbox
                self._sandbox_configs[env_id] = config

            return sandbox

        except Exception as e:
            logger.exception(f"Failed to create sandbox of type {sandbox_type}")
            return None

    def get_sandbox(self, env_id: str) -> Optional[BaseSandbox]:
        """获取已创建的沙箱实例."""
        return self._sandboxes.get(env_id)

    async def close_sandbox(self, env_id: str) -> bool:
        """关闭指定的沙箱实例."""
        sandbox = self._sandboxes.pop(env_id, None)
        if sandbox:
            try:
                await sandbox.close()
                self._sandbox_configs.pop(env_id, None)
                return True
            except Exception as e:
                logger.warning(f"Failed to close sandbox {env_id}: {e}")
        return False

    async def close_all(self) -> None:
        """关闭所有沙箱实例."""
        for env_id in list(self._sandboxes.keys()):
            await self.close_sandbox(env_id)

    def list_sandboxes(self) -> Dict[str, Dict[str, Any]]:
        """列出所有沙箱实例及其配置."""
        return {
            env_id: {
                "type": self._sandbox_configs.get(env_id, {}).get("type", "unknown"),
                "config": self._sandbox_configs.get(env_id, {}),
            }
            for env_id in self._sandboxes.keys()
        }


# 全局沙箱管理器实例
_sandbox_manager: Optional[SandboxManager] = None


def get_sandbox_manager() -> SandboxManager:
    """获取全局沙箱管理器实例."""
    global _sandbox_manager
    if _sandbox_manager is None:
        _sandbox_manager = SandboxManager()
    return _sandbox_manager


async def create_sandbox_from_environment(
    env_config: Dict[str, Any],
) -> Optional[BaseSandbox]:
    """
    从环境配置创建沙箱实例.

    Args:
        env_config: 环境配置，包含 sandbox_type, sandbox_config 等

    Returns:
        沙箱实例
    """
    manager = get_sandbox_manager()

    sandbox_type = env_config.get("sandbox_type", "native")
    sandbox_config = env_config.get("sandbox_config_json", {})
    if isinstance(sandbox_config, str):
        import json
        try:
            sandbox_config = json.loads(sandbox_config)
        except Exception:
            sandbox_config = {}

    # 合并资源配置
    resource_limits = env_config.get("resource_limits_json", {})
    if isinstance(resource_limits, str):
        import json
        try:
            resource_limits = json.loads(resource_limits)
        except Exception:
            resource_limits = {}

    config = {
        **sandbox_config,
        "resource_limits": resource_limits,
        "api_key": env_config.get("api_key"),
    }

    env_id = env_config.get("id")
    return manager.create_sandbox(sandbox_type, config, env_id)