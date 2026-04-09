"""数据库连接模块 - 指向与 backend 共享的同一个 meowone.db"""
from __future__ import annotations

import aiosqlite
from contextlib import asynccontextmanager
from typing import AsyncIterator

from app.config import DATABASE_PATH


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    """获取数据库连接，Row factory 设为 aiosqlite.Row（支持按列名访问）"""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()
