"""
应用生命周期管理 —— 启动时注册所有算法、策略、数据库和工具。

在 FastAPI lifespan 中：
1. 初始化数据库（建表 + 迁移）
2. 播种内置数据（loops / strategies / models / skills）
3. 注册内置能力（工具）
4. 注册所有 Loop 算法（触发 @loop_algorithm 装饰器）
5. 注册所有调度策略（触发 @dispatch_strategy 装饰器）
"""
from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

import aiosqlite

from app.config import DATABASE_PATH
from app.capability.registry import registry
from app.bootstrap.capabilities import register_builtin_capabilities
from app.loop.engine import import_all_algorithms
from app.dispatch.gateway import import_all_strategies

logger = logging.getLogger(__name__)


# ============================================================
# 正确 Schema（服务层实际使用的表名和列名）
# ============================================================
_CORRECT_SCHEMA = {
    "organizations": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        parent_org_id TEXT,
        settings_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "agents": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent_type TEXT NOT NULL DEFAULT 'internal',
        description TEXT DEFAULT '',
        system_prompt TEXT DEFAULT '',
        mcp_servers TEXT DEFAULT '[]',
        agent_skills TEXT DEFAULT '[]',
        allow_tools TEXT DEFAULT '[]',
        deny_tools TEXT DEFAULT '[]',
        max_rounds INTEGER,
        max_tool_phases INTEGER,
        timeout_seconds INTEGER,
        prompt_key TEXT DEFAULT '',
        base_url TEXT DEFAULT '',
        protocol TEXT DEFAULT 'a2a',
        metadata_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        source TEXT DEFAULT 'db',
        org_id TEXT,
        capabilities_json TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(agent_type, name)
    """,
    "llm_models": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL DEFAULT 'openai',
        base_url TEXT DEFAULT '',
        api_key TEXT DEFAULT '',
        is_default INTEGER DEFAULT 0,
        extra_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        source TEXT DEFAULT 'db',
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "prompts": """
        id TEXT PRIMARY KEY,
        prompt_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        content_md TEXT NOT NULL,
        description TEXT DEFAULT '',
        tags_json TEXT DEFAULT '[]',
        enabled INTEGER DEFAULT 1,
        source TEXT DEFAULT 'db',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "mcp_servers": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        command TEXT DEFAULT '',
        args_json TEXT DEFAULT '[]',
        cwd TEXT,
        transport TEXT DEFAULT 'stdio',
        url TEXT,
        auth_type TEXT DEFAULT 'none',
        auth_token TEXT,
        env_json TEXT DEFAULT '{}',
        config_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        source TEXT DEFAULT 'db',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "skills": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        body TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1,
        source TEXT DEFAULT 'db',
        updated_at TEXT DEFAULT (datetime('now')),
        trigger_keywords TEXT DEFAULT '{}',
        category TEXT DEFAULT '',
        examples TEXT DEFAULT '[]',
        version TEXT DEFAULT '1.0'
    """,
    "loops": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        module_path TEXT NOT NULL,
        config_schema_json TEXT DEFAULT '{}',
        is_system INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "strategies": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        module_path TEXT NOT NULL,
        config_schema_json TEXT DEFAULT '{}',
        is_system INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "environments": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        sandbox_type TEXT NOT NULL DEFAULT 'native',
        sandbox_config_json TEXT DEFAULT '{}',
        resource_limits_json TEXT DEFAULT '{}',
        allowed_tools_json TEXT DEFAULT '[]',
        denied_tools_json TEXT DEFAULT '[]',
        max_rounds INTEGER,
        timeout_seconds INTEGER,
        api_key TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "agent_images": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        agent_ids_json TEXT DEFAULT '[]',
        loop_id TEXT,
        strategy_id TEXT,
        environment_id TEXT,
        metadata_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "agent_instances": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        image_id TEXT,
        model_name TEXT DEFAULT '',
        strategy_config_id TEXT,
        strategy_config_json TEXT DEFAULT '{}',
        runtime_config_json TEXT DEFAULT '{}',
        metadata_json TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'stopped',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "teams": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        org_id TEXT,
        parent_team_id TEXT,
        leader_agent_id TEXT,
        default_strategy TEXT DEFAULT 'direct',
        strategy_config_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "team_members": """
        team_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        context_json TEXT DEFAULT '{}',
        joined_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (team_id, agent_id)
    """,
    "sessions": """
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT DEFAULT '',
        agent_name TEXT DEFAULT '',
        agent_type TEXT DEFAULT '',
        updated_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
    """,
    "messages": """
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        content TEXT NOT NULL DEFAULT '',
        card_data TEXT DEFAULT NULL,
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    """,
    "channel_sessions": """
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        external_thread_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "scheduled_tasks": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        agent_name TEXT NOT NULL,
        prompt TEXT DEFAULT '',
        interval_seconds INTEGER NOT NULL DEFAULT 60,
        scheduler_mode TEXT DEFAULT 'direct',
        task_tag TEXT DEFAULT '',
        enabled INTEGER DEFAULT 1,
        next_run_at TEXT,
        last_run_at TEXT,
        last_status TEXT DEFAULT '',
        last_output TEXT DEFAULT '',
        last_error TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "agent_execution_logs": """
        id TEXT PRIMARY KEY,
        execution_id TEXT NOT NULL,
        agent_name TEXT NOT NULL,
        agent_type TEXT DEFAULT '',
        status TEXT NOT NULL,
        duration_ms INTEGER DEFAULT 0,
        error_code TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
    """,
    "workflows": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        nodes_json TEXT DEFAULT '[]',
        strategy TEXT DEFAULT 'direct',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "workflow_executions": """
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        inputs_json TEXT DEFAULT '{}',
        outputs_json TEXT DEFAULT '{}',
        error_message TEXT DEFAULT '',
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER DEFAULT 0,
        node_results_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    """,
    "menus": """
        id TEXT PRIMARY KEY,
        menu_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        path TEXT DEFAULT '',
        component TEXT DEFAULT '',
        icon TEXT DEFAULT '',
        parent_key TEXT,
        sort INTEGER DEFAULT 0,
        visible INTEGER DEFAULT 1,
        enabled INTEGER DEFAULT 1,
        meta_json TEXT DEFAULT '{}',
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "tasks": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        task_type TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        agent_name TEXT DEFAULT '',
        agent_type TEXT DEFAULT '',
        input_json TEXT DEFAULT '{}',
        output_json TEXT DEFAULT '{}',
        error_message TEXT DEFAULT '',
        started_at TEXT,
        completed_at TEXT,
        duration_ms INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "strategy_configs": """
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        image_id TEXT,
        strategy_id TEXT,
        config_json TEXT DEFAULT '{}',
        enabled INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    """,
    "loop_logs": """
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    """,
}


def _parse_cols(schema: str) -> set:
    """从建表语句中提取列名集合"""
    import re
    cols = set()
    for line in schema.split(","):
        m = re.match(r"^\s*(\w+)", line.strip())
        if m:
            cols.add(m.group(1))
    return cols


async def _rebuild_table(db: aiosqlite.Connection, table: str, new_schema: str) -> None:
    """重建表：创建临时表 -> 复制数据 -> 删除旧表 -> 重命名新表"""
    temp = f"__{table}__new"
    await db.execute(f"CREATE TABLE {temp} ({new_schema})")

    try:
        cur = await db.execute(f"PRAGMA table_info({table})")
        old_cols = [r["name"] for r in await cur.fetchall()]
        new_cols = _parse_cols(new_schema)
        common = [c for c in old_cols if c in new_cols]
        if common:
            await db.execute(
                f"INSERT INTO {temp} ({', '.join(common)}) SELECT {', '.join(common)} FROM {table}"
            )
    except Exception as e:
        logger.warning("迁移 %s 数据时出错（非致命）: %s", table, e)

    await db.execute(f"DROP TABLE {table}")
    await db.execute(f"ALTER TABLE {temp} RENAME TO {table}")
    logger.info("重建表 %s 完成", table)


async def _init_db() -> None:
    """初始化并迁移数据库表结构（幂等执行）"""
    logger.info("初始化数据库: %s", DATABASE_PATH)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        cur = await db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing = {r["name"]: True for r in await cur.fetchall()}

        for table, schema in _CORRECT_SCHEMA.items():
            if table not in existing:
                await db.execute(f"CREATE TABLE {table} ({schema})")
                logger.info("创建表 %s", table)
            else:
                existing_cols = _parse_cols(schema)
                try:
                    cur = await db.execute(f"PRAGMA table_info({table})")
                    current_cols = {r["name"] for r in await cur.fetchall()}
                except Exception:
                    current_cols = set()

                missing = existing_cols - current_cols
                extra = current_cols - existing_cols

                if missing or extra:
                    # 检查是否有用户数据：有数据时只记录警告，不重建（防止数据丢失）
                    try:
                        cur = await db.execute(f"SELECT COUNT(*) FROM {table}")
                        count = (await cur.fetchone())[0]
                    except Exception:
                        count = 0

                    if count > 0:
                        logger.warning(
                            "表 %s 有 %d 行用户数据，列与期望不一致（缺少=%s，多余=%s），跳过重建以保护数据",
                            table, count, missing or "无", extra or "无",
                        )
                        # 尝试增量 ALTER TABLE 补齐缺失列（向后兼容，不丢失数据）
                        for col in missing:
                            try:
                                # 推断列类型：TEXT 为通用安全类型
                                col_type = "TEXT"
                                await db.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
                                logger.info("ALTER TABLE: 为 %s 补加列 %s", table, col)
                            except Exception as alt_err:
                                logger.warning("ALTER TABLE %s.%s 失败（非致命）: %s", table, col, alt_err)
                    else:
                        logger.info(
                            "迁移表 %s: 缺少列=%s, 多余列=%s",
                            table, missing or "无", extra or "无",
                        )
                        await _rebuild_table(db, table, schema)
                else:
                    logger.info("表 %s 结构正确，跳过", table)

        await db.commit()

    logger.info("数据库初始化完成")


# ============================================================
# 内置种子数据
# ============================================================

async def _seed_builtin_data() -> None:
    """播种内置数据（幂等插入，只在空表时生效）"""
    logger.info("播种内置数据 ...")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        # 1. 内置 Loop 算法
        builtin_loops = [
            ("react", "app.loop.algorithms.react", "ReAct 思考-行动-观察循环，支持并行工具调用"),
            ("plan_exec", "app.loop.algorithms.plan_exec", "计划-执行模式，先规划后逐步执行"),
            ("direct", "app.loop.algorithms.direct", "直连模式，最基础的纯生成算法，不使用工具和历史"),
        ]
        for name, module, desc in builtin_loops:
            cur = await db.execute("SELECT COUNT(*) FROM loops WHERE name = ?", (name,))
            if (await cur.fetchone())[0] == 0:
                await db.execute(
                    "INSERT INTO loops (id, name, module_path, description, is_system, enabled) VALUES (?, ?, ?, ?, 1, 1)",
                    (str(uuid.uuid4()), name, module, desc),
                )
                logger.info("播种 loop: %s", name)

        # 2. 内置调度策略
        builtin_strategies = [
            ("direct", "app.dispatch.strategies.direct", "直接调度：直接调用单个智能体处理任务"),
            ("team_dispatch", "app.dispatch.strategies.team_dispatch", "团队调度：将任务分发给团队成员智能体"),
            ("capability_match", "app.dispatch.strategies.capability_match", "能力匹配：根据任务需求匹配最佳智能体"),
        ]
        for name, module, desc in builtin_strategies:
            cur = await db.execute("SELECT COUNT(*) FROM strategies WHERE name = ?", (name,))
            if (await cur.fetchone())[0] == 0:
                await db.execute(
                    "INSERT INTO strategies (id, name, module_path, description, is_system, enabled) VALUES (?, ?, ?, ?, 1, 1)",
                    (str(uuid.uuid4()), name, module, desc),
                )
                logger.info("播种 strategy: %s", name)

        # 3. 默认大模型
        cur = await db.execute("SELECT COUNT(*) FROM llm_models")
        if (await cur.fetchone())[0] == 0:
            from app.config import LLM_MODEL, LLM_BASE_URL, LLM_API_KEY
            await db.execute(
                """INSERT INTO llm_models (id, name, provider, base_url, api_key, is_default, enabled, source)
                   VALUES (?, ?, 'openai', ?, ?, 1, 1, 'default-seed')""",
                (str(uuid.uuid4()), LLM_MODEL, LLM_BASE_URL, LLM_API_KEY),
            )
            logger.info("播种默认模型: %s", LLM_MODEL)

        # 4. 从 .meowone/skills 目录加载内置 skill（文件系统来源）
        import json
        from pathlib import Path
        skills_root = Path(__file__).resolve().parents[3] / ".meowone" / "skills"
        if skills_root.is_dir():
            for skill_dir in skills_root.iterdir():
                if not skill_dir.is_dir():
                    continue
                skill_name = skill_dir.name
                desc_file = skill_dir / "description.md"
                body_file = skill_dir / "system_prompt.md"
                trigger_file = skill_dir / "trigger_keywords.json"

                desc = desc_file.read_text(encoding="utf-8").strip() if desc_file.exists() else ""
                body = body_file.read_text(encoding="utf-8").strip() if body_file.exists() else ""
                triggers = (
                    json.loads(trigger_file.read_text(encoding="utf-8"))
                    if trigger_file.exists()
                    else {}
                )

                cur = await db.execute("SELECT COUNT(*) FROM skills WHERE name = ?", (skill_name,))
                if (await cur.fetchone())[0] == 0:
                    await db.execute(
                        """INSERT INTO skills (id, name, description, body, source, trigger_keywords, category, enabled)
                           VALUES (?, ?, ?, ?, 'fs-import', ?, 'agent', 1)""",
                        (str(uuid.uuid4()), skill_name, desc, body, json.dumps(triggers, ensure_ascii=False)),
                    )
                    logger.info("播种 skill (fs): %s", skill_name)

        await db.commit()

    logger.info("内置数据播种完成")


@asynccontextmanager
async def lifespan(app):
    """FastAPI lifespan：启动时注册，关闭时清理"""
    logger.info("backend_v2 启动中 ...")

    # 1. 初始化数据库
    await _init_db()

    # 2. 播种内置数据
    await _seed_builtin_data()

    # 3. 注册内置能力（工具）
    register_builtin_capabilities(registry)
    logger.info("内置能力注册完成: %d 个工具", len(registry.list_all()))

    # 4. 注册所有 Loop 算法（触发 @loop_algorithm 装饰器）
    import_all_algorithms()
    logger.info("Loop 算法注册完成")

    # 5. 注册所有调度策略（触发 @dispatch_strategy 装饰器）
    import_all_strategies()
    logger.info("调度策略注册完成")

    logger.info("backend_v2 启动完成")
    yield

    logger.info("backend_v2 关闭中 ...")
