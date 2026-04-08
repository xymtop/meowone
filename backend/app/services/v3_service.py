from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.db.database import get_db


# ============================================================
# Organization Service
# ============================================================

async def create_organization(
    *,
    name: str,
    description: str = "",
    parent_org_id: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    org_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO organizations (id, name, description, parent_org_id, settings_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (org_id, name, description, parent_org_id, json.dumps(settings or {}, ensure_ascii=False)),
        )
        await db.commit()
    return await get_organization_by_id(org_id)


async def list_organizations(parent_org_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM organizations"
    params: List[Any] = []
    if parent_org_id is not None:
        query += " WHERE parent_org_id = ?"
        params.append(parent_org_id)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_org_to_dict(r) for r in rows]


async def get_organization_by_id(org_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM organizations WHERE id = ? LIMIT 1", (org_id,))
        row = await cur.fetchone()
    return _org_to_dict(row) if row else None


async def update_organization(
    org_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    parent_org_id: Optional[Optional[str]] = None,
    settings: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_organization_by_id(org_id)
    if not existing:
        return None
    updates: List[str] = []
    params: List[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if parent_org_id is not None:
        updates.append("parent_org_id = ?")
        params.append(parent_org_id)
    if settings is not None:
        updates.append("settings_json = ?")
        params.append(json.dumps(settings, ensure_ascii=False))
    if not updates:
        return existing
    updates.append("updated_at = datetime('now')")
    params.append(org_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE organizations SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_organization_by_id(org_id)


async def delete_organization(org_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM organizations WHERE id = ?", (org_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _org_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["settings_json"] = json.loads(data.get("settings_json") or "{}")
    except Exception:
        data["settings_json"] = {}
    return data


# ============================================================
# Team Service
# ============================================================

async def create_team(
    *,
    name: str,
    org_id: str,
    description: str = "",
    parent_team_id: Optional[str] = None,
    leader_agent_id: Optional[str] = None,
    default_strategy: str = "direct",
    strategy_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    team_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO teams (id, name, description, org_id, parent_team_id, leader_agent_id, default_strategy, strategy_config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                team_id,
                name,
                description,
                org_id,
                parent_team_id,
                leader_agent_id,
                default_strategy,
                json.dumps(strategy_config or {}, ensure_ascii=False),
            ),
        )
        await db.commit()
    return await get_team_by_id(team_id)


async def list_teams(org_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM teams"
    params: List[Any] = []
    if org_id:
        query += " WHERE org_id = ?"
        params.append(org_id)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_team_to_dict(r) for r in rows]


async def get_team_by_id(team_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM teams WHERE id = ? LIMIT 1", (team_id,))
        row = await cur.fetchone()
    if not row:
        return None
    result = _team_to_dict(row)
    # 获取成员列表
    member_cur = await db.execute(
        "SELECT agent_id, role FROM team_members WHERE team_id = ?", (team_id,)
    )
    members = await member_cur.fetchall()
    result["member_agent_ids"] = [m["agent_id"] for m in members]
    return result


async def update_team(
    team_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    leader_agent_id: Optional[Optional[str]] = None,
    default_strategy: Optional[str] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_team_by_id(team_id)
    if not existing:
        return None
    updates: List[str] = []
    params: List[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if leader_agent_id is not None:
        updates.append("leader_agent_id = ?")
        params.append(leader_agent_id)
    if default_strategy is not None:
        updates.append("default_strategy = ?")
        params.append(default_strategy)
    if strategy_config is not None:
        updates.append("strategy_config_json = ?")
        params.append(json.dumps(strategy_config, ensure_ascii=False))
    if not updates:
        return existing
    updates.append("updated_at = datetime('now')")
    params.append(team_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE teams SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_team_by_id(team_id)


async def delete_team(team_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM teams WHERE id = ?", (team_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


async def add_team_member(team_id: str, agent_id: str, role: str = "member") -> bool:
    async with get_db() as db:
        await db.execute(
            "INSERT OR IGNORE INTO team_members (team_id, agent_id, role) VALUES (?, ?, ?)",
            (team_id, agent_id, role),
        )
        await db.commit()
    return True


async def remove_team_member(team_id: str, agent_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM team_members WHERE team_id = ? AND agent_id = ?",
            (team_id, agent_id),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


def _team_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["strategy_config_json"] = json.loads(data.get("strategy_config_json") or "{}")
    except Exception:
        data["strategy_config_json"] = {}
    return data


# ============================================================
# Loop Service
# ============================================================

async def create_loop(
    *,
    name: str,
    description: str = "",
    module_path: str,
    config_schema: Optional[Dict[str, Any]] = None,
    is_system: bool = False,
) -> Dict[str, Any]:
    loop_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO loops (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (loop_id, name, description, module_path, json.dumps(config_schema or {}, ensure_ascii=False), 1 if is_system else 0),
        )
        await db.commit()
    return await get_loop_by_id(loop_id)


async def list_loops(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM loops"
    params: List[Any] = []
    if enabled is not None:
        query += " WHERE enabled = ?"
        params.append(1 if enabled else 0)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_loop_to_dict(r) for r in rows]


async def get_loop_by_id(loop_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM loops WHERE id = ? LIMIT 1", (loop_id,))
        row = await cur.fetchone()
    return _loop_to_dict(row) if row else None


async def get_loop_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM loops WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    return _loop_to_dict(row) if row else None


async def update_loop(
    loop_id: str,
    *,
    description: Optional[str] = None,
    config_schema: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_loop_by_id(loop_id)
    if not existing:
        return None
    updates: List[str] = []
    params: List[Any] = []
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if config_schema is not None:
        updates.append("config_schema_json = ?")
        params.append(json.dumps(config_schema, ensure_ascii=False))
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)
    if not updates:
        return existing
    updates.append("updated_at = datetime('now')")
    params.append(loop_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE loops SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_loop_by_id(loop_id)


async def delete_loop(loop_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM loops WHERE id = ?", (loop_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _loop_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["config_schema_json"] = json.loads(data.get("config_schema_json") or "{}")
    except Exception:
        data["config_schema_json"] = {}
    data["is_system"] = bool(data.get("is_system"))
    data["enabled"] = bool(data.get("enabled"))
    return data


# ============================================================
# Strategy Service
# ============================================================

async def create_strategy(
    *,
    name: str,
    description: str = "",
    module_path: str,
    config_schema: Optional[Dict[str, Any]] = None,
    is_system: bool = False,
) -> Dict[str, Any]:
    strategy_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO strategies (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            """,
            (strategy_id, name, description, module_path, json.dumps(config_schema or {}, ensure_ascii=False), 1 if is_system else 0),
        )
        await db.commit()
    return await get_strategy_by_id(strategy_id)


async def list_strategies(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM strategies"
    params: List[Any] = []
    if enabled is not None:
        query += " WHERE enabled = ?"
        params.append(1 if enabled else 0)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_strategy_to_dict(r) for r in rows]


async def get_strategy_by_id(strategy_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategies WHERE id = ? LIMIT 1", (strategy_id,))
        row = await cur.fetchone()
    return _strategy_to_dict(row) if row else None


async def get_strategy_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategies WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    return _strategy_to_dict(row) if row else None


async def update_strategy(
    strategy_id: str,
    *,
    description: Optional[str] = None,
    config_schema: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_strategy_by_id(strategy_id)
    if not existing:
        return None
    updates: List[str] = []
    params: List[Any] = []
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if config_schema is not None:
        updates.append("config_schema_json = ?")
        params.append(json.dumps(config_schema, ensure_ascii=False))
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)
    if not updates:
        return existing
    updates.append("updated_at = datetime('now')")
    params.append(strategy_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE strategies SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_strategy_by_id(strategy_id)


async def delete_strategy(strategy_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM strategies WHERE id = ?", (strategy_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _strategy_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["config_schema_json"] = json.loads(data.get("config_schema_json") or "{}")
    except Exception:
        data["config_schema_json"] = {}
    data["is_system"] = bool(data.get("is_system"))
    data["enabled"] = bool(data.get("enabled"))
    return data


# ============================================================
# Environment Service
# ============================================================

async def create_environment(
    *,
    name: str,
    description: str = "",
    sandbox_type: str = "native",
    sandbox_config: Optional[Dict[str, Any]] = None,
    resource_limits: Optional[Dict[str, Any]] = None,
    allowed_tools: Optional[List[str]] = None,
    denied_tools: Optional[List[str]] = None,
    max_rounds: int = 10,
    timeout_seconds: int = 300,
) -> Dict[str, Any]:
    env_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO environments (
                id, name, description, sandbox_type, sandbox_config_json,
                resource_limits_json, allowed_tools_json, denied_tools_json,
                max_rounds, timeout_seconds, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                env_id,
                name,
                description,
                sandbox_type,
                json.dumps(sandbox_config or {}, ensure_ascii=False),
                json.dumps(resource_limits or {}, ensure_ascii=False),
                json.dumps(allowed_tools or [], ensure_ascii=False),
                json.dumps(denied_tools or [], ensure_ascii=False),
                max_rounds,
                timeout_seconds,
            ),
        )
        await db.commit()
    return await get_environment_by_id(env_id)


async def list_environments(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM environments"
    params: List[Any] = []
    if enabled is not None:
        query += " WHERE enabled = ?"
        params.append(1 if enabled else 0)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_env_to_dict(r) for r in rows]


async def get_environment_by_id(env_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM environments WHERE id = ? LIMIT 1", (env_id,))
        row = await cur.fetchone()
    return _env_to_dict(row) if row else None


async def update_environment(
    env_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    sandbox_type: Optional[str] = None,
    sandbox_config: Optional[Dict[str, Any]] = None,
    resource_limits: Optional[Dict[str, Any]] = None,
    allowed_tools: Optional[List[str]] = None,
    denied_tools: Optional[List[str]] = None,
    max_rounds: Optional[int] = None,
    timeout_seconds: Optional[int] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_environment_by_id(env_id)
    if not existing:
        return None
    updates: List[str] = []
    params: List[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if sandbox_type is not None:
        updates.append("sandbox_type = ?")
        params.append(sandbox_type)
    if sandbox_config is not None:
        updates.append("sandbox_config_json = ?")
        params.append(json.dumps(sandbox_config, ensure_ascii=False))
    if resource_limits is not None:
        updates.append("resource_limits_json = ?")
        params.append(json.dumps(resource_limits, ensure_ascii=False))
    if allowed_tools is not None:
        updates.append("allowed_tools_json = ?")
        params.append(json.dumps(allowed_tools, ensure_ascii=False))
    if denied_tools is not None:
        updates.append("denied_tools_json = ?")
        params.append(json.dumps(denied_tools, ensure_ascii=False))
    if max_rounds is not None:
        updates.append("max_rounds = ?")
        params.append(max_rounds)
    if timeout_seconds is not None:
        updates.append("timeout_seconds = ?")
        params.append(timeout_seconds)
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)
    if not updates:
        return existing
    updates.append("updated_at = datetime('now')")
    params.append(env_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE environments SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_environment_by_id(env_id)


async def delete_environment(env_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM environments WHERE id = ?", (env_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _env_to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    for key in ("sandbox_config_json", "resource_limits_json", "allowed_tools_json", "denied_tools_json"):
        try:
            data[key] = json.loads(data.get(key) or ("[]" if "tools" in key else "{}"))
        except Exception:
            data[key] = [] if "tools" in key else {}
    data["enabled"] = bool(data.get("enabled"))
    return data
