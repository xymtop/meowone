"""Run the Mermaid Assistant agent as an A2A server (official a2a-sdk)."""
from __future__ import annotations

import os

import uvicorn
from dotenv import load_dotenv

load_dotenv()

from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill, TransportProtocol

from agent_executor import MermaidAssistantAgentExecutor

PORT = int(os.getenv("PORT", "8003"))
PUBLIC_BASE = os.getenv("PUBLIC_BASE_URL", f"http://127.0.0.1:{PORT}").rstrip("/")

skill = AgentSkill(
    id="mermaid_diagram",
    name="Mermaid 图表生成",
    description="根据文本描述生成 Mermaid 流程图、时序图、ER 图等",
    tags=["mermaid", "diagram", "visualization"],
    examples=["帮我画一个登录流程图", "把这个系统关系输出成 Mermaid ER 图"],
)

public_agent_card = AgentCard(
    name="Mermaid Assistant",
    description="Creates and refines Mermaid diagrams from natural language requirements.",
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
    agent_executor=MermaidAssistantAgentExecutor(),
    task_store=InMemoryTaskStore(),
)

server = A2AStarletteApplication(
    agent_card=public_agent_card,
    http_handler=request_handler,
)

if __name__ == "__main__":
    uvicorn.run(server.build(), host="0.0.0.0", port=PORT)
