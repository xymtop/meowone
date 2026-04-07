from __future__ import annotations

from fastapi import APIRouter, FastAPI

from app.api.agent_executions import router as agent_executions_router
from app.api.agents import router as agents_router
from app.api.chat import router as chat_router
from app.api.capability_management import router as capability_management_router
from app.api.gateway import router as gateway_router
from app.api.internal_agents import router as internal_agents_router
from app.api.meowone_config import router as meowone_config_router
from app.api.menu_management import router as menu_management_router
from app.api.model_management import router as model_management_router
from app.api.messages import router as messages_router
from app.api.openai import router as openai_router
from app.api.prompt_management import router as prompt_management_router
from app.api.scheduled_tasks import router as scheduled_tasks_router
from app.api.sessions import router as sessions_router

api_router = APIRouter()
api_router.include_router(agent_executions_router)
api_router.include_router(sessions_router)
api_router.include_router(messages_router)
api_router.include_router(agents_router)
api_router.include_router(chat_router)
api_router.include_router(capability_management_router)
api_router.include_router(gateway_router)
api_router.include_router(openai_router)
api_router.include_router(model_management_router)
api_router.include_router(menu_management_router)
api_router.include_router(prompt_management_router)
api_router.include_router(meowone_config_router)
api_router.include_router(internal_agents_router)
api_router.include_router(scheduled_tasks_router)


def include_api_routers(app: FastAPI) -> None:
    app.include_router(api_router)
