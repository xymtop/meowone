from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.db.database import get_db


# ============================================================
# Loop Service
# ============================================================

@dataclass
class LoopDefinition:
    id: str
    name: str
    description: str
    module_path: str
    config_schema: Dict[str, Any]
    is_system: bool
    enabled: bool
    created_at: str
    updated_at: str


def _parse_loop_row(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["config_schema"] = json.loads(data.get("config_schema_json") or "{}")
    except Exception:
        data["config_schema"] = {}
    data.pop("config_schema_json", None)
    data["is_system"] = bool(data.get("is_system", 0))
    data["enabled"] = bool(data.get("enabled", 1))
    return data


async def create_loop(
    *,
    name: str,
    module_path: str,
    description: str = "",
    config_schema: Optional[Dict[str, Any]] = None,
    is_system: bool = False,
    enabled: bool = True,
) -> Dict[str, Any]:
    loop_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO loops (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                loop_id,
                name,
                description,
                module_path,
                json.dumps(config_schema or {}, ensure_ascii=False),
                1 if is_system else 0,
                1 if enabled else 0,
            ),
        )
        await db.commit()
    return await get_loop(loop_id)


async def list_loops(include_disabled: bool = False) -> List[Dict[str, Any]]:
    query = "SELECT * FROM loops"
    if not include_disabled:
        query += " WHERE enabled = 1"
    query += " ORDER BY is_system DESC, name ASC"
    async with get_db() as db:
        cur = await db.execute(query)
        rows = await cur.fetchall()
    return [_parse_loop_row(r) for r in rows]


async def get_loop(loop_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM loops WHERE id = ? LIMIT 1",
            (loop_id,),
        )
        row = await cur.fetchone()
    return _parse_loop_row(row) if row else None


async def get_loop_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM loops WHERE name = ? LIMIT 1",
            (name,),
        )
        row = await cur.fetchone()
    return _parse_loop_row(row) if row else None


async def update_loop(
    loop_id: str,
    *,
    description: Optional[str] = None,
    config_schema: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
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
        return await get_loop(loop_id)
    updates.append("updated_at = datetime('now')")
    params.append(loop_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE loops SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_loop(loop_id)


async def delete_loop(loop_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM loops WHERE id = ?",
            (loop_id,),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


# ============================================================
# Strategy Service
# ============================================================

@dataclass
class StrategyDefinition:
    id: str
    name: str
    description: str
    module_path: str
    config_schema: Dict[str, Any]
    is_system: bool
    enabled: bool
    created_at: str
    updated_at: str


def _parse_strategy_row(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["config_schema"] = json.loads(data.get("config_schema_json") or "{}")
    except Exception:
        data["config_schema"] = {}
    data.pop("config_schema_json", None)
    data["is_system"] = bool(data.get("is_system", 0))
    data["enabled"] = bool(data.get("enabled", 1))
    return data


async def create_strategy(
    *,
    name: str,
    module_path: str,
    description: str = "",
    config_schema: Optional[Dict[str, Any]] = None,
    is_system: bool = False,
    enabled: bool = True,
) -> Dict[str, Any]:
    strategy_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO strategies (id, name, description, module_path, config_schema_json, is_system, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                strategy_id,
                name,
                description,
                module_path,
                json.dumps(config_schema or {}, ensure_ascii=False),
                1 if is_system else 0,
                1 if enabled else 0,
            ),
        )
        await db.commit()
    return await get_strategy(strategy_id)


async def list_strategies(include_disabled: bool = False) -> List[Dict[str, Any]]:
    query = "SELECT * FROM strategies"
    if not include_disabled:
        query += " WHERE enabled = 1"
    query += " ORDER BY is_system DESC, name ASC"
    async with get_db() as db:
        cur = await db.execute(query)
        rows = await cur.fetchall()
    return [_parse_strategy_row(r) for r in rows]


async def get_strategy(strategy_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM strategies WHERE id = ? LIMIT 1",
            (strategy_id,),
        )
        row = await cur.fetchone()
    return _parse_strategy_row(row) if row else None


async def get_strategy_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM strategies WHERE name = ? LIMIT 1",
            (name,),
        )
        row = await cur.fetchone()
    return _parse_strategy_row(row) if row else None


async def update_strategy(
    strategy_id: str,
    *,
    description: Optional[str] = None,
    config_schema: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
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
        return await get_strategy(strategy_id)
    updates.append("updated_at = datetime('now')")
    params.append(strategy_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE strategies SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_strategy(strategy_id)


async def delete_strategy(strategy_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM strategies WHERE id = ?",
            (strategy_id,),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


# ============================================================
# Environment Service
# ============================================================

@dataclass
class Environment:
    id: str
    name: str
    description: str
    sandbox_type: str
    sandbox_config: Dict[str, Any]
    resource_limits: Dict[str, Any]
    allowed_tools: List[str]
    denied_tools: List[str]
    max_rounds: int
    timeout_seconds: int
    enabled: bool
    created_at: str
    updated_at: str


def _parse_env_row(row: Any) -> Dict[str, Any]:
    data = dict(row)
    for key, json_key in [
        ("sandbox_config", "sandbox_config_json"),
        ("resource_limits", "resource_limits_json"),
    ]:
        try:
            data[key] = json.loads(data.get(json_key) or "{}")
        except Exception:
            data[key] = {}
        data.pop(json_key, None)
    for key in ("allowed_tools", "denied_tools"):
        try:
            parsed = json.loads(data.get(key + "_json") or "[]")
            data[key] = [str(x) for x in parsed if str(x).strip()] if isinstance(parsed, list) else []
        except Exception:
            data[key] = []
        data.pop(key + "_json", None)
    data["enabled"] = bool(data.get("enabled", 1))
    return data


async def create_environment(
    *,
    name: str,
    sandbox_type: str = "native",
    description: str = "",
    sandbox_config: Optional[Dict[str, Any]] = None,
    resource_limits: Optional[Dict[str, Any]] = None,
    allowed_tools: Optional[List[str]] = None,
    denied_tools: Optional[List[str]] = None,
    max_rounds: int = 10,
    timeout_seconds: int = 300,
    enabled: bool = True,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                1 if enabled else 0,
            ),
        )
        await db.commit()
    return await get_environment(env_id)


async def list_environments(include_disabled: bool = False) -> List[Dict[str, Any]]:
    query = "SELECT * FROM environments"
    if not include_disabled:
        query += " WHERE enabled = 1"
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query)
        rows = await cur.fetchall()
    return [_parse_env_row(r) for r in rows]


async def get_environment(env_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM environments WHERE id = ? LIMIT 1",
            (env_id,),
        )
        row = await cur.fetchone()
    return _parse_env_row(row) if row else None


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
        return await get_environment(env_id)
    updates.append("updated_at = datetime('now')")
    params.append(env_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE environments SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_environment(env_id)


async def delete_environment(env_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM environments WHERE id = ?",
            (env_id,),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0
