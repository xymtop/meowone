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
from app.services.agent_service import list_external_agents_sync
from app.capability.tools.subagent_tool import SubagentSchedulerTool
from app.capability.tools.write_workspace_file import WriteWorkspaceFileTool

# 调度层工具（主模型只使用这些做决策）
DISPATCH_TOOL_NAMES = frozenset([
    "load_agent_skill"
])

# 远程 A2A 子智能体也属于调度层（主模型通过它们分发任务）
REMOTE_AGENT_TOOL_PREFIX = "remote_a2a_"

logger = logging.getLogger(__name__)


def register_builtin_capabilities(registry: CapabilityRegistry) -> None:
    registry.register(CardBuilderCapability())
    registry.register(BashTool())
    registry.register(SandboxTool())  # 统一沙盒工具（根据环境配置选择 native/docker/e2b）
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

    agents = list_external_agents_sync()
    logger.info("已从 agents 数据表加载 %s 个远程 A2A 工具", len(agents))
    for agent in agents:
        registry.register(
            RemoteA2AAgentCapability(
                name=agent.tool_name,
                description=agent.description,
                base_url=agent.base_url,
            )
        )
