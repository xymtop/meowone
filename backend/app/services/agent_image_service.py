"""
Agent Image & Instance Service (智能体镜像和实例服务)

## 核心概念

### 镜像 (Agent Image)
镜像 = 选中的智能体列表 + Loop模式 + 调度策略 + 调度配置文件 + 执行环境

镜像定义了智能体团队的结构，但不包含运行时信息。

### 实例 (Agent Instance)
实例 = 镜像 + 执行环境(覆盖) + 调度时大模型

实例是镜像的运行时实体，在对话中实际使用。

### 调度配置 (Strategy Config)
调度配置定义了调度策略的具体执行方式，可以是任意 JSON 格式。
例如主从结构：
{"topology": "master_slave", "master": "agent_id", "slaves": ["agent_id1", "agent_id2"]}
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


# ============================================================
# Agent Image Service (智能体镜像)
# ============================================================

async def create_agent_image(
    *,
    name: str,
    description: str = "",
    agent_ids: Optional[List[str]] = None,
    loop_id: Optional[str] = None,
    strategy_id: Optional[str] = None,
    strategy_config_id: Optional[str] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
    environment_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """创建智能体镜像
    
    Args:
        name: 镜像名称
        description: 镜像描述
        agent_ids: 选中的智能体ID列表
        loop_id: Loop模式ID
        strategy_id: 调度策略ID
        strategy_config_id: 调度配置文件ID（可选，优先级高于strategy_config）
        strategy_config: 调度配置内容（JSON）
        environment_id: 执行环境ID
        metadata: 元数据
    """
    image_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agent_images (
                id, name, description, agent_ids_json,
                loop_id, strategy_id, strategy_config_id, strategy_config_json,
                environment_id, metadata_json, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                image_id,
                name,
                description,
                json.dumps(agent_ids or [], ensure_ascii=False),
                loop_id,
                strategy_id,
                strategy_config_id,
                json.dumps(strategy_config or {}, ensure_ascii=False),
                environment_id,
                json.dumps(metadata or {}, ensure_ascii=False),
            ),
        )
        await db.commit()
    return await get_agent_image_by_id(image_id)


async def list_agent_images(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    """列出所有镜像"""
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
    """获取镜像"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_images WHERE id = ? LIMIT 1", (image_id,))
        row = await cur.fetchone()
    if not row:
        return None
    result = _image_to_dict(row)
    # 如果有 strategy_config_id，读取配置内容
    if result.get("strategy_config_id"):
        from app.services.strategy_config_service import get_strategy_config_by_id
        config = await get_strategy_config_by_id(result["strategy_config_id"])
        if config:
            result["strategy_config"] = config.get("config", {})
            result["strategy_config_name"] = config.get("name")
    return result


async def get_agent_image_by_name(name: str) -> Optional[Dict[str, Any]]:
    """根据名称获取镜像"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_images WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    if not row:
        return None
    return await get_agent_image_by_id(row["id"])


async def update_agent_image(
    image_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    agent_ids: Optional[List[str]] = None,
    loop_id: Optional[Optional[str]] = None,
    strategy_id: Optional[Optional[str]] = None,
    strategy_config_id: Optional[Optional[str]] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
    environment_id: Optional[Optional[str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    """更新镜像"""
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
    if strategy_config_id is not None:
        updates.append("strategy_config_id = ?")
        params.append(strategy_config_id)
    if strategy_config is not None:
        updates.append("strategy_config_json = ?")
        params.append(json.dumps(strategy_config, ensure_ascii=False))
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
    """删除镜像（会同时删除关联的实例）"""
    async with get_db() as db:
        # 先删除关联的实例
        await db.execute("DELETE FROM agent_instances WHERE image_id = ?", (image_id,))
        # 再删除镜像
        cur = await db.execute("DELETE FROM agent_images WHERE id = ?", (image_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _image_to_dict(row: Any) -> Dict[str, Any]:
    """将数据库行转换为字典"""
    if not row:
        return {}
    data = dict(row)
    for key in ("agent_ids_json",):
        try:
            data[key] = json.loads(data.get(key) or "[]")
        except Exception:
            data[key] = []
    for key in ("strategy_config_json", "metadata_json"):
        try:
            data[key] = json.loads(data.get(key) or "{}")
        except Exception:
            data[key] = {}
    data["enabled"] = bool(data.get("enabled"))
    # 简化字段名
    data["agent_ids"] = data.pop("agent_ids_json", [])
    data["strategy_config"] = data.pop("strategy_config_json", {})
    return data


# ============================================================
# Agent Instance Service (智能体实例)
# 实例 = 镜像 + 执行环境(覆盖) + 调度时大模型
# ============================================================

async def create_agent_instance(
    *,
    name: str,
    description: str = "",
    image_id: str,
    environment_id: Optional[str] = None,
    model_name: str = "",
    runtime_config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """创建智能体实例
    
    Args:
        name: 实例名称
        description: 实例描述
        image_id: 关联的镜像ID
        environment_id: 执行环境ID（可覆盖镜像配置）
        model_name: 调度时使用的大模型
        runtime_config: 运行时配置（可覆盖镜像配置）
        metadata: 元数据
    """
    instance_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agent_instances (
                id, name, description, image_id, environment_id, model_name,
                runtime_config_json, metadata_json, status, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stopped', 1)
            """,
            (
                instance_id,
                name,
                description,
                image_id,
                environment_id,
                model_name,
                json.dumps(runtime_config or {}, ensure_ascii=False),
                json.dumps(metadata or {}, ensure_ascii=False),
            ),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


async def list_agent_instances(enabled: Optional[bool] = None) -> List[Dict[str, Any]]:
    """列出所有实例"""
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
    """获取实例及其完整配置"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE id = ? LIMIT 1", (instance_id,))
        row = await cur.fetchone()
    if not row:
        return None
    
    result = _instance_to_dict(row)
    
    # 关联镜像信息（包含智能体列表、调度配置等）
    image = await get_agent_image_by_id(result["image_id"])
    if image:
        result["image"] = image
        
        # 合并执行环境：实例的 environment_id 优先，否则使用镜像的
        result["environment"] = None
        if result.get("environment_id"):
            from app.services.v3_service import get_environment_by_id
            result["environment"] = await get_environment_by_id(result["environment_id"])
        elif image.get("environment_id"):
            from app.services.v3_service import get_environment_by_id
            result["environment"] = await get_environment_by_id(image["environment_id"])
        
        # 获取镜像中的智能体详情
        agent_ids = image.get("agent_ids", [])
        if agent_ids:
            from app.services.agent_service import get_agent_by_id
            result["agents"] = []
            for aid in agent_ids:
                agent = await get_agent_by_id(aid)
                if agent:
                    result["agents"].append(agent)
    
    return result


async def get_agent_instance_by_name(name: str) -> Optional[Dict[str, Any]]:
    """根据名称获取实例"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agent_instances WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    if not row:
        return None
    return await get_agent_instance_by_id(row["id"])


async def update_agent_instance(
    instance_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    image_id: Optional[str] = None,
    environment_id: Optional[Optional[str]] = None,
    model_name: Optional[str] = None,
    runtime_config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    """更新实例"""
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
    if environment_id is not None:
        updates.append("environment_id = ?")
        params.append(environment_id)
    if model_name is not None:
        updates.append("model_name = ?")
        params.append(model_name)
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
    """删除实例"""
    async with get_db() as db:
        cur = await db.execute("DELETE FROM agent_instances WHERE id = ?", (instance_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


async def start_agent_instance(instance_id: str) -> Optional[Dict[str, Any]]:
    """启动实例"""
    async with get_db() as db:
        await db.execute(
            "UPDATE agent_instances SET status = 'running', updated_at = datetime('now') WHERE id = ?",
            (instance_id,),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


async def stop_agent_instance(instance_id: str) -> Optional[Dict[str, Any]]:
    """停止实例"""
    async with get_db() as db:
        await db.execute(
            "UPDATE agent_instances SET status = 'stopped', updated_at = datetime('now') WHERE id = ?",
            (instance_id,),
        )
        await db.commit()
    return await get_agent_instance_by_id(instance_id)


def _instance_to_dict(row: Any) -> Dict[str, Any]:
    """将数据库行转换为字典"""
    if not row:
        return {}
    data = dict(row)
    for key in ("runtime_config_json", "metadata_json"):
        try:
            data[key] = json.loads(data.get(key) or "{}")
        except Exception:
            data[key] = {}
    data["enabled"] = bool(data.get("enabled"))
    data["runtime_config"] = data.pop("runtime_config_json", {})
    return data
