"""
内置能力（工具）注册

在 FastAPI lifespan 启动时调用 register_builtin_capabilities(registry)，
将所有内置工具注册到全局能力注册表中。

外部 A2A 智能体（external agents）采用 lazy 加载策略：
首次有请求需要时再从数据库加载并注册，以避免启动时同步数据库操作。
"""
from __future__ import annotations

import logging

from app.capability.registry import CapabilityRegistry
from app.capability.tools.bash_tool import BashTool
from app.capability.tools.call_mcp_tool import CallMcpToolTool
from app.capability.tools.card_builder import CardBuilderCapability
from app.capability.tools.create_internal_agent import CreateInternalAgentTool
from app.capability.tools.sandbox_tool import SandboxTool
from app.capability.tools.invoke_internal_agent import InvokeInternalAgentTool
from app.capability.tools.list_internal_agents import ListInternalAgentsTool
from app.capability.tools.list_mcp_tools import ListMcpToolsTool
from app.capability.tools.list_workspace_dir import ListWorkspaceDirTool
from app.capability.tools.load_agent_skill import LoadAgentSkillTool
from app.capability.tools.manage_scheduled_tasks import ManageScheduledTasksTool
from app.capability.tools.read_workspace_file import ReadWorkspaceFileTool
from app.capability.tools.remote_a2a_agent import RemoteA2AAgentCapability
from app.capability.tools.subagent_tool import SubagentSchedulerTool
from app.capability.tools.write_workspace_file import WriteWorkspaceFileTool

logger = logging.getLogger(__name__)

DISPATCH_TOOL_NAMES = frozenset(["load_agent_skill"])
REMOTE_AGENT_TOOL_PREFIX = "remote_a2a_"

# external agents 是否已注册（lazy 加载标志）
_external_agents_registered: bool = False


def register_builtin_capabilities(registry: CapabilityRegistry) -> None:
    """注册所有内置工具（不含 external agents）"""
    registry.register(CardBuilderCapability())
    registry.register(BashTool())
    registry.register(SandboxTool())
    registry.register(ReadWorkspaceFileTool())
    registry.register(WriteWorkspaceFileTool())
    registry.register(ListWorkspaceDirTool())
    registry.register(ListMcpToolsTool())
    registry.register(CallMcpToolTool())
    registry.register(SubagentSchedulerTool())
    registry.register(CreateInternalAgentTool())
    registry.register(ListInternalAgentsTool())
    registry.register(InvokeInternalAgentTool())
    registry.register(ManageScheduledTasksTool())
    registry.register(LoadAgentSkillTool())
    logger.info("内置工具注册完成: %d 个", len(registry.list_all()))


async def ensure_external_agents_registered(registry: CapabilityRegistry) -> None:
    """Lazy 加载并注册外部 A2A 智能体。仅首次调用时执行注册。"""
    global _external_agents_registered
    if _external_agents_registered:
        return
    from app.services.services.agent_service import list_external_agents
    agents = await list_external_agents()
    for agent in agents:
        registry.register(
            RemoteA2AAgentCapability(
                name=agent.tool_name,
                description=agent.description,
                base_url=agent.base_url,
            )
        )
    _external_agents_registered = True
    logger.info("外部 A2A 智能体注册完成: %d 个", len(agents))
