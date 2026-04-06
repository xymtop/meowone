"""Run the Doc Assistant agent as an A2A server (official a2a-sdk)."""
from __future__ import annotations

import os

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill, TransportProtocol

from agent_executor import DocAssistantAgentExecutor

PORT = int(os.getenv("PORT", "8002"))
PUBLIC_BASE = os.getenv("PUBLIC_BASE_URL", f"http://127.0.0.1:{PORT}").rstrip("/")

skill = AgentSkill(
    id="doc_help",
    name="文档与摘要",
    description="撰写说明文档、摘要、提纲与改写润色",
    tags=["documentation", "writing"],
    examples=["把下面内容整理成 README 大纲", "用一段话总结这篇文章的要点"],
)

public_agent_card = AgentCard(
    name="Doc Assistant",
    description="Helps with documentation, summaries, outlines, and clear writing.",
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
    agent_executor=DocAssistantAgentExecutor(),
    task_store=InMemoryTaskStore(),
)

server = A2AStarletteApplication(
    agent_card=public_agent_card,
    http_handler=request_handler,
)

if __name__ == "__main__":
    uvicorn.run(server.build(), host="0.0.0.0", port=PORT)
