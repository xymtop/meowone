"""Run the Code Writer agent as an A2A server (official a2a-sdk)."""
from __future__ import annotations

import os

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill, TransportProtocol

from agent_executor import CodeWriterAgentExecutor

PORT = int(os.getenv("PORT", "8001"))
PUBLIC_BASE = os.getenv("PUBLIC_BASE_URL", f"http://127.0.0.1:{PORT}").rstrip("/")

skill = AgentSkill(
    id="write_code",
    name="编写与审查代码",
    description="生成代码、重构、排查思路与最佳实践说明",
    tags=["code", "programming"],
    examples=["用 Python 写一个快速排序", "Review this function for bugs"],
)

public_agent_card = AgentCard(
    name="Code Writer",
    description="Writes, refactors, and reviews code; concise technical explanations.",
    url=PUBLIC_BASE,
    icon_url=f"{PUBLIC_BASE}/",
    version="1.0.0",
    default_input_modes=["text"],
    default_output_modes=["text"],
    capabilities=AgentCapabilities(streaming=False),
    preferred_transport=TransportProtocol.jsonrpc,
    skills=[skill],
)

request_handler = DefaultRequestHandler(
    agent_executor=CodeWriterAgentExecutor(),
    task_store=InMemoryTaskStore(),
)

server = A2AStarletteApplication(
    agent_card=public_agent_card,
    http_handler=request_handler,
)

if __name__ == "__main__":
    uvicorn.run(server.build(), host="0.0.0.0", port=PORT)
