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
    agent_name TEXT DEFAULT '',
    agent_type TEXT DEFAULT '',
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
    command TEXT,
    cwd TEXT,
    description TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT DEFAULT 'db',
    transport TEXT DEFAULT 'stdio',
    url TEXT,
    auth_type TEXT DEFAULT 'none',
    auth_token TEXT,
    env_json TEXT DEFAULT '{}',
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
    trigger_keywords TEXT DEFAULT '[]',
    category TEXT DEFAULT 'general',
    examples TEXT DEFAULT '[]',
    version TEXT DEFAULT '1.0.0',
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

CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    strategy TEXT DEFAULT 'direct',
    nodes_json TEXT DEFAULT '[]',
    node_count INTEGER DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows (name);

CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    inputs_json TEXT DEFAULT '{}',
    outputs_json TEXT DEFAULT '{}',
    error_message TEXT,
    node_results_json TEXT DEFAULT '[]',
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow
ON workflow_executions (workflow_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
ON workflow_executions (status, created_at);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input_json TEXT DEFAULT '{}',
    output_json TEXT DEFAULT '{}',
    agent_name TEXT,
    agent_type TEXT,
    error_message TEXT,
    parent_task_id TEXT,
    metadata_json TEXT DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    started_at TEXT,
    completed_at TEXT,
    duration_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_name ON tasks (name);

-- ============================================================
-- MeowOne v3 新增表
-- ============================================================

-- 组织表
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    parent_org_id TEXT REFERENCES organizations(id),
    settings_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_organizations_parent
ON organizations (parent_org_id);

-- 团队表
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_team_id TEXT REFERENCES teams(id),
    leader_agent_id TEXT,
    default_strategy TEXT DEFAULT 'direct',
    strategy_config_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_teams_org ON teams (org_id);

-- 团队成员关联表
CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (team_id, agent_id)
);

-- Loop 定义表
CREATE TABLE IF NOT EXISTS loops (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    module_path TEXT NOT NULL,
    config_schema_json TEXT DEFAULT '{}',
    is_system INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 策略定义表
CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    module_path TEXT NOT NULL,
    config_schema_json TEXT DEFAULT '{}',
    is_system INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 环境表
CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    sandbox_type TEXT DEFAULT 'native',
    sandbox_config_json TEXT DEFAULT '{}',
    resource_limits_json TEXT DEFAULT '{}',
    allowed_tools_json TEXT DEFAULT '[]',
    denied_tools_json TEXT DEFAULT '[]',
    max_rounds INTEGER DEFAULT 10,
    timeout_seconds INTEGER DEFAULT 300,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- 调度配置文件表（可扩展的 JSON 配置）
-- 每个配置定义一个调度拓扑，如主从结构、层级结构等
-- ============================================================
CREATE TABLE IF NOT EXISTS strategy_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    -- 关联的策略ID
    strategy_id TEXT REFERENCES strategies(id),
    -- 调度配置文件内容（任意JSON格式，方便扩展）
    -- 例如主从结构：{"topology": "master_slave", "master": "agent_id", "slaves": ["agent_id1", "agent_id2"]}
    config_json TEXT DEFAULT '{}',
    -- 配置模板类型（用于前端编辑器渲染）
    template_type TEXT DEFAULT 'custom',
    -- 是否系统内置
    is_system INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- MeowOne v3.1 智能体镜像表
-- 镜像 = 选中的智能体列表 + 调度策略 + 调度配置文件 + 执行环境
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_images (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    -- 选中的智能体列表（存储智能体ID）
    agent_ids_json TEXT DEFAULT '[]',
    -- 调度配置
    loop_id TEXT REFERENCES loops(id),
    strategy_id TEXT REFERENCES strategies(id),
    -- 调度配置文件ID（可选，定义拓扑结构）
    strategy_config_id TEXT REFERENCES strategy_configs(id),
    -- 调度配置内容（如果使用 strategy_config_id 则忽略此字段）
    strategy_config_json TEXT DEFAULT '{}',
    environment_id TEXT REFERENCES environments(id),
    -- 元数据
    metadata_json TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- MeowOne v3.1 智能体实例表
-- 实例 = 镜像 + 执行环境 + 调度时大模型
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    image_id TEXT NOT NULL REFERENCES agent_images(id),  -- 关联的镜像
    environment_id TEXT REFERENCES environments(id),   -- 执行环境（可覆盖镜像配置）
    -- 调度时使用的大模型（可覆盖镜像配置）
    model_name TEXT DEFAULT '',
    -- 运行时配置（可覆盖镜像配置）
    runtime_config_json TEXT DEFAULT '{}',
    status TEXT DEFAULT 'stopped',           -- stopped, running
    metadata_json TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_images_name ON agent_images (name);
CREATE INDEX IF NOT EXISTS idx_agent_instances_name ON agent_instances (name);
CREATE INDEX IF NOT EXISTS idx_agent_instances_image ON agent_instances (image_id);
CREATE INDEX IF NOT EXISTS idx_strategy_configs_name ON strategy_configs (name);
"""

_INSERT_DEFAULT_USER = "INSERT OR IGNORE INTO users (id, username) VALUES ('default', 'user');"


async def init_db() -> None:
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(_CREATE_TABLES)
        await _migrate_agents_table(db)
        await _migrate_mcp_servers_table(db)
        await _migrate_skills_table(db)
        await _migrate_v3_tables(db)
        await _migrate_agent_images_table(db)
        await _migrate_agent_instances_table(db)
        await _migrate_environments_table(db)
        await _migrate_strategy_configs_table(db)
        await _seed_v3_system_records(db)
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


async def _migrate_mcp_servers_table(db: aiosqlite.Connection) -> None:
    cur = await db.execute("PRAGMA table_info(mcp_servers)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    if "transport" not in cols:
        await db.execute("ALTER TABLE mcp_servers ADD COLUMN transport TEXT DEFAULT 'stdio'")
    if "url" not in cols:
        await db.execute("ALTER TABLE mcp_servers ADD COLUMN url TEXT")
    if "auth_type" not in cols:
        await db.execute("ALTER TABLE mcp_servers ADD COLUMN auth_type TEXT DEFAULT 'none'")
    if "auth_token" not in cols:
        await db.execute("ALTER TABLE mcp_servers ADD COLUMN auth_token TEXT")
    if "env_json" not in cols:
        await db.execute("ALTER TABLE mcp_servers ADD COLUMN env_json TEXT DEFAULT '{}'")


async def _migrate_skills_table(db: aiosqlite.Connection) -> None:
    cur = await db.execute("PRAGMA table_info(skills)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    if "trigger_keywords" not in cols:
        await db.execute("ALTER TABLE skills ADD COLUMN trigger_keywords TEXT DEFAULT '[]'")
    if "category" not in cols:
        await db.execute("ALTER TABLE skills ADD COLUMN category TEXT DEFAULT 'general'")
    if "examples" not in cols:
        await db.execute("ALTER TABLE skills ADD COLUMN examples TEXT DEFAULT '[]'")
    if "version" not in cols:
        await db.execute("ALTER TABLE skills ADD COLUMN version TEXT DEFAULT '1.0.0'")


async def _migrate_v3_tables(db: aiosqlite.Connection) -> None:
    """v3 新增表的迁移：为 agents 表添加 org_id, loop_id, environment_id, capabilities_json, load, status"""
    cur = await db.execute("PRAGMA table_info(agents)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    if "org_id" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN org_id TEXT")
    if "loop_id" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN loop_id TEXT")
    if "environment_id" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN environment_id TEXT")
    if "capabilities_json" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN capabilities_json TEXT DEFAULT '[]'")
    if "load" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN load INTEGER DEFAULT 0")
    if "status" not in cols:
        await db.execute("ALTER TABLE agents ADD COLUMN status TEXT DEFAULT 'online'")


async def _migrate_agent_images_table(db: aiosqlite.Connection) -> None:
    """agent_images 表的迁移：添加缺失的列"""
    cur = await db.execute("PRAGMA table_info(agent_images)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    
    if "agent_ids_json" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN agent_ids_json TEXT DEFAULT '[]'")
    if "loop_id" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN loop_id TEXT")
    if "strategy_id" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN strategy_id TEXT")
    if "strategy_config_id" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN strategy_config_id TEXT")
    if "strategy_config_json" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN strategy_config_json TEXT DEFAULT '{}'")
    if "environment_id" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN environment_id TEXT")
    if "metadata_json" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN metadata_json TEXT DEFAULT '{}'")
    if "enabled" not in cols:
        await db.execute("ALTER TABLE agent_images ADD COLUMN enabled INTEGER DEFAULT 1")


async def _migrate_environments_table(db: aiosqlite.Connection) -> None:
    """environments 表的迁移：添加 api_key 字段"""
    cur = await db.execute("PRAGMA table_info(environments)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    if "api_key" not in cols:
        await db.execute("ALTER TABLE environments ADD COLUMN api_key TEXT DEFAULT ''")


async def _migrate_strategy_configs_table(db: aiosqlite.Connection) -> None:
    """strategy_configs 表的迁移：检查表是否存在并添加缺失的列"""
    cur = await db.execute("PRAGMA table_info(strategy_configs)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows} if rows else set()
    
    # 表不存在则创建
    if "name" not in cols:
        # 表不存在，需要创建整个表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS strategy_configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT DEFAULT '',
                strategy_id TEXT,
                config_json TEXT DEFAULT '{}',
                template_type TEXT DEFAULT 'custom',
                is_system INTEGER DEFAULT 0,
                enabled INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            )
        """)


async def _migrate_agent_instances_table(db: aiosqlite.Connection) -> None:
    """agent_instances 表的迁移：添加缺失的列"""
    cur = await db.execute("PRAGMA table_info(agent_instances)")
    rows = await cur.fetchall()
    cols = {str(r[1]) for r in rows}
    
    if "environment_id" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN environment_id TEXT")
    if "model_name" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN model_name TEXT DEFAULT ''")
    if "runtime_config_json" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN runtime_config_json TEXT DEFAULT '{}'")
    if "status" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN status TEXT DEFAULT 'stopped'")
    if "metadata_json" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN metadata_json TEXT DEFAULT '{}'")
    if "enabled" not in cols:
        await db.execute("ALTER TABLE agent_instances ADD COLUMN enabled INTEGER DEFAULT 1")


async def _seed_v3_system_records(db: aiosqlite.Connection) -> None:
    """v3 初始化内置 Loop 和 Strategy 记录"""
    import uuid

    # 内置 Loop
    built_in_loops = [
        {
            "id": str(uuid.uuid4()),
            "name": "react",
            "description": "标准 ReAct 模式：思考 → 行动 → 观察",
            "module_path": "app.loops.react",
            "config_schema_json": '{"max_steps": {"type": "integer", "default": 10}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "plan_exec",
            "description": "计划-执行分离：先规划再逐步执行",
            "module_path": "app.loops.plan_exec",
            "config_schema_json": '{"max_plan_depth": {"type": "integer", "default": 3}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "multi_agent_debate",
            "description": "多智能体辩论：多个候选者并行思考后投票",
            "module_path": "app.loops.multi_agent_debate",
            "config_schema_json": '{"candidates": {"type": "integer", "default": 3}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "hierarchical",
            "description": "层级式执行：上级规划，下级执行",
            "module_path": "app.loops.hierarchical",
            "config_schema_json": '{"levels": {"type": "integer", "default": 2}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "critic",
            "description": "批评-改进模式：生成 → 批评 → 改进",
            "module_path": "app.loops.critic",
            "config_schema_json": '{"max_iterations": {"type": "integer", "default": 3}}',
            "is_system": 1,
            "enabled": 1,
        },
    ]

    for loop in built_in_loops:
        await db.execute(
            """
            INSERT OR IGNORE INTO loops (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (:id, :name, :description, :module_path, :config_schema_json, :is_system, :enabled)
            """,
            loop,
        )

    # 内置 Strategy
    built_in_strategies = [
        {
            "id": str(uuid.uuid4()),
            "name": "direct",
            "description": "直接执行：直接分发到指定目标",
            "module_path": "app.scheduler.strategies.direct",
            "config_schema_json": "{}",
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "round_robin",
            "description": "轮询分配：负载均衡轮流分配任务",
            "module_path": "app.scheduler.strategies.round_robin",
            "config_schema_json": "{}",
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "capability_match",
            "description": "能力匹配：根据任务需求匹配最佳智能体",
            "module_path": "app.scheduler.strategies.capability_match",
            "config_schema_json": '{"match_fields": {"type": "array", "default": ["capabilities"]}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "team_dispatch",
            "description": "团队分发：分解任务并分配给团队成员",
            "module_path": "app.scheduler.strategies.team_dispatch",
            "config_schema_json": '{"parallel": {"type": "boolean", "default": true}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "hierarchical",
            "description": "层级上报：任务逐级上报处理",
            "module_path": "app.scheduler.strategies.hierarchical",
            "config_schema_json": '{"levels": {"type": "integer", "default": 3}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "auction",
            "description": "竞拍模式：智能体竞争任务",
            "module_path": "app.scheduler.strategies.auction",
            "config_schema_json": '{"bidding_timeout": {"type": "integer", "default": 30}}',
            "is_system": 1,
            "enabled": 1,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "democratic",
            "description": "民主协商：多个智能体协商后决策",
            "module_path": "app.scheduler.strategies.democratic",
            "config_schema_json": '{"quorum": {"type": "integer", "default": 3}}',
            "is_system": 1,
            "enabled": 1,
        },
    ]

    for strategy in built_in_strategies:
        await db.execute(
            """
            INSERT OR IGNORE INTO strategies (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (:id, :name, :description, :module_path, :config_schema_json, :is_system, :enabled)
            """,
            strategy,
        )


@asynccontextmanager
async def get_db() -> AsyncIterator[aiosqlite.Connection]:
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()
