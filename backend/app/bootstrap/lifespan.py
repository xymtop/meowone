from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.bootstrap.capabilities import register_builtin_capabilities
from app.capability.registry import registry
from app.config_loaders import invalidate_config_cache
from app.db.database import init_db
from app.services.scheduled_task_service import start_scheduled_task_worker, stop_scheduled_task_worker


@asynccontextmanager
async def app_lifespan(app: FastAPI) -> AsyncIterator[None]:
    _ = app
    await init_db()
    invalidate_config_cache()
    register_builtin_capabilities(registry)
    await start_scheduled_task_worker()
    yield
    await stop_scheduled_task_worker()
