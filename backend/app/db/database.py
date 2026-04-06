from __future__ import annotations
import aiosqlite
from contextlib import asynccontextmanager
from typing import AsyncIterator
from app.config import DATABASE_PATH

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    card_data TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loop_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    message_id TEXT,
    round INTEGER NOT NULL,
    phase TEXT NOT NULL,
    capability TEXT,
    input_data TEXT,
    output_data TEXT,
    duration_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

_INSERT_DEFAULT_USER = "INSERT OR IGNORE INTO users (id, username) VALUES ('default', 'user');"


async def init_db() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.executescript(_CREATE_TABLES)
        await db.execute(_INSERT_DEFAULT_USER)
        await db.commit()


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
