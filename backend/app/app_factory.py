"""
MeowOne 应用工厂模块
负责创建和配置 FastAPI 应用实例
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import include_api_routers
from app.bootstrap.lifespan import app_lifespan


def create_app() -> FastAPI:
    """
    创建并配置 FastAPI 应用实例
    
    该函数完成以下工作：
    1. 创建 FastAPI 应用，设置 API 元数据（标题、版本、描述等）
    2. 配置 CORS 中间件，允许跨域请求
    3. 注册所有 API 路由
    4. 配置应用生命周期管理器（启动/关闭事件）
    """
    app = FastAPI(
        title="MeowOne AI Agent Platform",
        version="0.1.0",
        description="""
# MeowOne AI Agent Platform API

## 概述
MeowOne 是一个智能体(Agent)编排平台，支持多智能体协作、任务调度、技能管理等功能。

## 主要功能模块
- **会话管理** - 创建和管理对话会话
- **智能体管理** - 注册和配置内部/外部智能体
- **MCP 服务** - 集成 Model Context Protocol 服务
- **技能管理** - 管理 Agent Skills
- **工作流** - 定义和执行多节点工作流
- **定时任务** - 配置周期性任务
- **模型管理** - 配置 LLM 模型
- **v3 API** - 组织、团队、Loop、策略、环境等管理

## 认证说明
当前版本未启用鉴权，所有接口公开访问。

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
        # 配置应用生命周期管理器，处理启动和关闭事件
        lifespan=app_lifespan,
        # API 文档配置
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    
    # ============================================================
    # 配置 CORS（跨域资源共享）中间件
    # allow_origins=["*"] 允许所有来源的跨域请求
    # ============================================================
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],           # 允许所有来源
        allow_credentials=True,         # 允许携带凭证（cookies、认证头等）
        allow_methods=["*"],           # 允许所有 HTTP 方法
        allow_headers=["*"],           # 允许所有请求头
    )
    
    # 注册所有 API 路由
    include_api_routers(app)

    # ============================================================
    # 健康检查接口
    # 用于负载均衡器或监控系统检查应用状态
    # ============================================================
    @app.get("/health", tags=["健康检查"])
    async def health() -> dict[str, str]:
        """健康检查接口 - 返回应用运行状态"""
        return {"status": "ok"}

    return app
