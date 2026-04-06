from __future__ import annotations
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import init_db
from app.api.sessions import router as sessions_router
from app.api.messages import router as messages_router
from app.api.chat import router as chat_router
from app.api.meowone_config import router as meowone_config_router
from app.capability.registry import registry
from app.config_loaders import invalidate_config_cache
from app.capability.tools.bash_tool import BashTool
from app.capability.tools.call_mcp_tool import CallMcpToolTool
from app.capability.tools.card_builder import CardBuilderCapability
from app.capability.tools.list_mcp_tools import ListMcpToolsTool
from app.capability.tools.list_workspace_dir import ListWorkspaceDirTool
from app.capability.tools.read_workspace_file import ReadWorkspaceFileTool
from app.capability.tools.remote_a2a_agent import RemoteA2AAgentCapability
from app.capability.tools.subagent_tool import SubagentSchedulerTool
from app.capability.tools.write_workspace_file import WriteWorkspaceFileTool
from app.capability.tools.load_agent_skill import LoadAgentSkillTool
from app.agents_config import load_remote_agents

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    invalidate_config_cache()
    registry.register(CardBuilderCapability())
    registry.register(BashTool())
    registry.register(ReadWorkspaceFileTool())
    registry.register(WriteWorkspaceFileTool())
    registry.register(ListWorkspaceDirTool())
    registry.register(ListMcpToolsTool())
    registry.register(CallMcpToolTool())
    registry.register(SubagentSchedulerTool())
    registry.register(LoadAgentSkillTool())
    agents = load_remote_agents()
    logger.info("已从 agents 配置加载 %s 个远程 A2A 工具", len(agents))
    for agent in agents:
        registry.register(
            RemoteA2AAgentCapability(
                name=agent.tool_name,
                description=agent.description,
                base_url=agent.base_url,
            )
        )
    yield


app = FastAPI(title="MeowOne", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(chat_router)
app.include_router(meowone_config_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
