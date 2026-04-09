"""
应用生命周期管理模块
处理 FastAPI 应用的启动和关闭事件

在应用启动时：
1. 安装日志处理器
2. 初始化数据库
3. 清除配置缓存
4. 注册内置能力（工具）
5. 启动定时任务工作器

在应用关闭时：
1. 停止定时任务工作器
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.bootstrap.capabilities import register_builtin_capabilities
from app.capability.registry import registry
from app.config_loaders import invalidate_config_cache
from app.db.database import init_db
from app.services.scheduled_task_service import start_scheduled_task_worker, stop_scheduled_task_worker
from app.services import log_stream_service


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    应用生命周期管理器
    
    这是一个异步上下文管理器，在应用启动时执行前置代码，
    在应用关闭时执行后置代码（yield 之后的代码）。
    """
    _ = app  # 避免未使用变量的警告
    
    # ============================================================
    # 启动阶段：按顺序执行初始化任务
    # ============================================================
    
    # 1. 安装应用日志处理器，捕获并记录应用日志
    log_stream_service.install_app_log_handler()
    
    # 2. 初始化数据库（创建表结构、设置默认值等）
    await init_db()
    
    # 3. 清除配置缓存，确保加载最新的配置
    invalidate_config_cache()
    
    # 4. 注册内置能力（工具），如文件读写、bash 命令等
    register_builtin_capabilities(registry)
    
    # 5. 启动定时任务工作器，处理周期性任务
    await start_scheduled_task_worker()
    
    # yield 之后的代码在应用关闭时执行
    yield
    
    # ============================================================
    # 关闭阶段：清理资源
    # ============================================================
    
    # 停止定时任务工作器
    await stop_scheduled_task_worker()
