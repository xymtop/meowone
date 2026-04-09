"""
MeowOne 应用工厂模块
负责创建和配置 FastAPI 应用实例
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import include_api_routers
from app.bootstrap.lifespan import lifespan


def create_app() -> FastAPI:
    """
    创建并配置 FastAPI 应用实例
    
    完成以下工作：
    1. 创建 FastAPI 应用，设置 API 元数据
    2. 配置 CORS 中间件
    3. 注册所有 API 路由
    4. 配置应用生命周期管理器
    """
    app = FastAPI(
        title="MeowOne AI Agent Platform",
        version="0.2.0",
        description="""
# MeowOne AI Agent Platform API (backend_v2)

## 概述
MeowOne 是一个智能体(Agent)编排平台，支持多智能体协作、任务调度、技能管理等功能。

## 核心模块
- **Loop 算法引擎**：支持 react、plan_exec 等执行模式
- **调度策略引擎**：支持 direct、team_dispatch、capability_match 等策略
- **动态智能体构建**：从数据库配置实时构建 AgentRuntime
- **能力注册表**：统一管理工具、MCP、Skill

## SSE 事件流
流式接口返回以下事件类型：
- `thinking` - 思考中
- `delta` - 内容增量
- `card` - 卡片数据
- `tool_call` - 工具调用
- `tool_result` - 工具结果
- `error` - 错误
- `done` - 完成
        """,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    include_api_routers(app)

    @app.get("/health", tags=["健康检查"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": "backend_v2"}

    return app
