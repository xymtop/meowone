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

CREATE TABLE IF NOT EXISTS channel_sessions (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    external_thread_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(channel_id, external_thread_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    card_data TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
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
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_channel_sessions_session_id
ON channel_sessions (session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_created
ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_agent_created
ON agent_execution_logs (agent_name, created_at);

CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    command TEXT NOT NULL,
    cwd TEXT,
    description TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'db',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    body TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'db',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agent_type TEXT NOT NULL, -- internal | external
    description TEXT DEFAULT '',
    system_prompt TEXT DEFAULT '',
    base_url TEXT,
    mcp_servers TEXT DEFAULT '[]',
    agent_skills TEXT DEFAULT '[]',
    allow_tools TEXT DEFAULT '[]',
    deny_tools TEXT DEFAULT '[]',
    max_rounds INTEGER,
    max_tool_phases INTEGER,
    timeout_seconds INTEGER,
    protocol TEXT DEFAULT 'internal_loop',
    prompt_key TEXT DEFAULT '',
    metadata_json TEXT DEFAULT '{}',
    enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'db',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(agent_type, name)
);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    agent_name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    scheduler_mode TEXT DEFAULT 'direct',
    task_tag TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    next_run_at TEXT,
    last_run_at TEXT,
    last_status TEXT,
    last_output TEXT,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run
ON scheduled_tasks (enabled, next_run_at);

CREATE TABLE IF NOT EXISTS llm_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    provider TEXT DEFAULT 'openai-compatible',
    base_url TEXT NOT NULL,
    api_key TEXT DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    extra_json TEXT DEFAULT '{}',
    source TEXT DEFAULT 'db',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_models_single_default
ON llm_models(is_default) WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS menus (
    id TEXT PRIMARY KEY,
    menu_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    path TEXT DEFAULT '',
    component TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    parent_key TEXT,
    sort INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    meta_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_key) REFERENCES menus(menu_key) ON DELETE SET NULL,
    CHECK (menu_key <> COALESCE(parent_key, ''))
);

CREATE INDEX IF NOT EXISTS idx_menus_parent_sort
ON menus (parent_key, sort);

CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    prompt_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    content_md TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    tags_json TEXT DEFAULT '[]',
    enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'db',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompts_enabled
ON prompts (enabled, prompt_key);
"""

_INSERT_DEFAULT_USER = "INSERT OR IGNORE INTO users (id, username) VALUES ('default', 'user');"


async def init_db() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(_CREATE_TABLES)
        await _migrate_agents_table(db)
        await db.execute(_INSERT_DEFAULT_USER)
        await db.commit()


async def _migrate_agents_table(db: aiosqlite.Connection) -> None:
    cur = await db.execute("PRAGMA table_info(agents)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    if "protocol" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN protocol TEXT DEFAULT 'internal_loop'")
    if "prompt_key" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN prompt_key TEXT DEFAULT ''")
    if "metadata_json" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN metadata_json TEXT DEFAULT '{}'")


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()
