from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


# ============================================================
# Agent Image Service (智能体镜像)
# 镜像 = 选中的智能体列表 + 调度策略 + 执行环境
# ============================================================

async def create_agent_image(
    *,
    name: str,
    description: str = "",
    agent_ids: Optional[List[str]] = None,
    loop_id: Optional[str] = None,
    strategy_id: Optional[str] = None,
    environment_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    image_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agent_images (
                id, name, description, agent_ids_json,
                loop_id, strategy_id, environment_id,
                metadata_json, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                image_id,
                name,
                description,
                json.dumps(agent_ids or [], ensure_ascii=False),
                loop_id,
                strategy_id,
                environment_id,
                json.dumps(metadata or {}, ensure_ascii=False),
            ),
        )
        await db.commit()
    return await get_agent_image_by_id(image_id)


async def list_agent_images(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM agent_images"
    params: List[Any] = []
    if enabled is not None:
        query += " WHERE enabled = ?"
        params.append(1 if enabled else 0)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_image_to_dict(r) for r in rows]


async def get_agent_image_by_id(image_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_images WHERE id = ? LIMIT 1", (image_id,))
        row = await cur.fetchone()
    return _image_to_dict(row) if row else None


async def get_agent_image_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_images WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    return _image_to_dict(row) if row else None


async def update_agent_image(
    image_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    agent_ids: Optional[List[str]] = None,
    loop_id: Optional[Optional[str]] = None,
    strategy_id: Optional[Optional[str]] = None,
    environment_id: Optional[Optional[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_agent_image_by_id(image_id)
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
    if agent_ids is not None:
        updates.append("agent_ids_json = ?")
        params.append(json.dumps(agent_ids, ensure_ascii=False))
    if loop_id is not None:
        updates.append("loop_id = ?")
        params.append(loop_id)
    if strategy_id is not None:
        updates.append("strategy_id = ?")
        params.append(strategy_id)
    if environment_id is not None:
        updates.append("environment_id = ?")
        params.append(environment_id)
    if metadata is not None:
        updates.append("metadata_json = ?")
        params.append(json.dumps(metadata, ensure_ascii=False))
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)

    if not updates:
        return existing

    updates.append("updated_at = datetime('now')")
    params.append(image_id)

    async with get_db() as db:
        await db.execute(
            f"UPDATE agent_images SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()

    return await get_agent_image_by_id(image_id)


async def delete_agent_image(image_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM agent_images WHERE id = ?", (image_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _image_to_dict(row: Any) -> Dict[str, Any]:
    if not row:
        return {}
    data = dict(row)
    for key in ("agent_ids_json",):
        try:
            data[key] = json.loads(data.get(key) or "[]")
        except Exception:
            data[key] = []
    for key in ("metadata_json",):
        try:
            data[key] = json.loads(data.get(key) or "{}")
        except Exception:
            data[key] = {}
    data["enabled"] = bool(data.get("enabled"))
    data["agent_ids"] = data.pop("agent_ids_json", [])
    return data


# ============================================================
# Agent Instance Service (智能体实例)
# 实例 = 镜像的运行实体
# ============================================================

async def create_agent_instance(
    *,
    name: str,
    description: str = "",
    image_id: str,
    model_name: str = "",
    strategy_config_id: Optional[str] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
    runtime_config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    instance_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agent_instances (
                id, name, description, image_id, model_name,
                strategy_config_id, strategy_config_json,
                runtime_config_json, metadata_json, status, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'stopped', 1)
            """,
            (
                instance_id,
                name,
                description,
                image_id,
                model_name,
                strategy_config_id,
                json.dumps(strategy_config or {}, ensure_ascii=False),
                json.dumps(runtime_config or {}, ensure_ascii=False),
                json.dumps(metadata or {}, ensure_ascii=False),
            ),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


async def list_agent_instances(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM agent_instances"
    params: List[Any] = []
    if enabled is not None:
        query += " WHERE enabled = ?"
        params.append(1 if enabled else 0)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_instance_to_dict(r) for r in rows]


async def get_agent_instance_by_id(instance_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE id = ? LIMIT 1", (instance_id,))
        row = await cur.fetchone()
    if not row:
        return None
    result = _instance_to_dict(row)
    # 关联镜像信息
    image = await get_agent_image_by_id(result["image_id"])
    result["image"] = image
    return result


async def get_agent_instance_by_name(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    if not row:
        return None
    result = _instance_to_dict(row)
    image = await get_agent_image_by_id(result["image_id"])
    result["image"] = image
    return result


async def update_agent_instance(
    instance_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    image_id: Optional[str] = None,
    model_name: Optional[str] = None,
    strategy_config_id: Optional[Optional[str]] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
    runtime_config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    existing = await get_agent_instance_by_id(instance_id)
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
    if image_id is not None:
        updates.append("image_id = ?")
        params.append(image_id)
    if model_name is not None:
        updates.append("model_name = ?")
        params.append(model_name)
    if strategy_config_id is not None:
        updates.append("strategy_config_id = ?")
        params.append(strategy_config_id)
    if strategy_config is not None:
        updates.append("strategy_config_json = ?")
        params.append(json.dumps(strategy_config, ensure_ascii=False))
    if runtime_config is not None:
        updates.append("runtime_config_json = ?")
        params.append(json.dumps(runtime_config, ensure_ascii=False))
    if metadata is not None:
        updates.append("metadata_json = ?")
        params.append(json.dumps(metadata, ensure_ascii=False))
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)

    if not updates:
        return existing

    updates.append("updated_at = datetime('now')")
    params.append(instance_id)

    async with get_db() as db:
        await db.execute(
            f"UPDATE agent_instances SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()

    return await get_agent_instance_by_id(instance_id)


async def delete_agent_instance(instance_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM agent_instances WHERE id = ?", (instance_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


async def start_agent_instance(instance_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        await db.execute(
            "UPDATE agent_instances SET status = 'running', updated_at = datetime('now') WHERE id = ?",
            (instance_id,),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


async def stop_agent_instance(instance_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        await db.execute(
            "UPDATE agent_instances SET status = 'stopped', updated_at = datetime('now') WHERE id = ?",
            (instance_id,),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


def _instance_to_dict(row: Any) -> Dict[str, Any]:
    if not row:
        return {}
    data = dict(row)
    for key in ("strategy_config_json", "runtime_config_json", "metadata_json"):
        try:
            data[key] = json.loads(data.get(key) or "{}")
        except Exception:
            data[key] = {}
    data["enabled"] = bool(data.get("enabled"))
    data["strategy_config"] = data.pop("strategy_config_json", {})
    data["runtime_config"] = data.pop("runtime_config_json", {})
    return data
