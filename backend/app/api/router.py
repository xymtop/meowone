"""
API 路由聚合模块

将所有子模块的路由聚合到统一的 APIRouter 中。
"""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

# 导入所有 API 子模块的路由
from app.api.agent_executions import router as agent_executions_router
from app.api.agents import router as agents_router
from app.api.v3 import router as v3_router
from app.api.v3_images import router as v3_images_router
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
from app.api.workflows import router as workflows_router
from app.api.tasks import router as tasks_router


# 创建主 API 路由
api_router = APIRouter()

# 注册所有子路由
api_router.include_router(agent_executions_router)  # 智能体执行
api_router.include_router(sessions_router)          # 会话管理
api_router.include_router(messages_router)         # 消息管理
api_router.include_router(agents_router)             # 智能体管理
api_router.include_router(chat_router)              # 聊天接口
api_router.include_router(capability_management_router)  # 能力管理
api_router.include_router(gateway_router)           # 网关接口
api_router.include_router(openai_router)           # OpenAI 兼容接口
api_router.include_router(model_management_router)  # 模型管理
api_router.include_router(menu_management_router)    # 菜单管理
api_router.include_router(prompt_management_router)  # 提示词管理
api_router.include_router(meowone_config_router)   # MeowOne 配置
api_router.include_router(internal_agents_router)   # 内部智能体管理
api_router.include_router(scheduled_tasks_router)   # 定时任务
api_router.include_router(workflows_router)         # 工作流
api_router.include_router(tasks_router)             # 任务管理
api_router.include_router(v3_router)               # v3 API
api_router.include_router(v3_images_router)         # v3 图片接口


def include_api_routers(app: FastAPI) -> None:
    """将聚合后的路由注册到 FastAPI 应用

    Args:
        app: FastAPI 应用实例
    """
    app.include_router(api_router)
