"""
调度配置服务 (Strategy Config Service)

调度配置定义了调度策略的具体执行方式，可以是任意 JSON 格式，方便后期扩展。

常见配置类型：
1. master_slave: 主从结构
   {"topology": "master_slave", "master": "agent_id", "slaves": ["agent_id1", "agent_id2"]}

2. hierarchical: 层级结构
   {"topology": "hierarchical", "levels": [{"role": "manager", "agents": []}, {"role": "worker", "agents": []}]}

3. swarm: 蜂群结构
   {"topology": "swarm", "agents": ["agent_id1", "agent_id2"], "convergence": "voting"}
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


# ============================================================
# Strategy Config Service (调度配置服务)
# ============================================================

async def create_strategy_config(
    *,
    name: str,
    description: str = "",
    strategy_id: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    template_type: str = "custom",
    is_system: bool = False,
) -> Dict[str, Any]:
    """创建调度配置"""
    config_id = str(uuid.uuid4())
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO strategy_configs (
                id, name, description, strategy_id, config_json, template_type, is_system, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                config_id,
                name,
                description,
                strategy_id,
                json.dumps(config or {}, ensure_ascii=False),
                template_type,
                1 if is_system else 0,
            ),
        )
        await db.commit()
    return await get_strategy_config_by_id(config_id)


async def list_strategy_configs(
    strategy_id: Optional[str] = None,
    enabled: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """列出调度配置"""
    query = "SELECT * FROM strategy_configs WHERE 1=1"
    params: List[Any] = []
    
    if strategy_id:
        query += " AND strategy_id = ?"
        params.append(strategy_id)
    if enabled is not None:
        query += " AND enabled = ?"
        params.append(1 if enabled else 0)
    
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_config_to_dict(r) for r in rows]


async def get_strategy_config_by_id(config_id: str) -> Optional[Dict[str, Any]]:
    """获取调度配置"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategy_configs WHERE id = ? LIMIT 1", (config_id,))
        row = await cur.fetchone()
    return _config_to_dict(row) if row else None


async def get_strategy_config_by_name(name: str) -> Optional[Dict[str, Any]]:
    """根据名称获取调度配置"""
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM strategy_configs WHERE name = ? LIMIT 1", (name,))
        row = await cur.fetchone()
    return _config_to_dict(row) if row else None


async def update_strategy_config(
    config_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    strategy_id: Optional[Optional[str]] = None,
    config: Optional[Dict[str, Any]] = None,
    template_type: Optional[str] = None,
    enabled: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    """更新调度配置"""
    existing = await get_strategy_config_by_id(config_id)
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
    if strategy_id is not None:
        updates.append("strategy_id = ?")
        params.append(strategy_id)
    if config is not None:
        updates.append("config_json = ?")
        params.append(json.dumps(config, ensure_ascii=False))
    if template_type is not None:
        updates.append("template_type = ?")
        params.append(template_type)
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)

    if not updates:
        return existing

    updates.append("updated_at = datetime('now')")
    params.append(config_id)

    async with get_db() as db:
        await db.execute(
            f"UPDATE strategy_configs SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()

    return await get_strategy_config_by_id(config_id)


async def delete_strategy_config(config_id: str) -> bool:
    """删除调度配置"""
    async with get_db() as db:
        # 解除镜像的引用
        await db.execute(
            "UPDATE agent_images SET strategy_config_id = NULL WHERE strategy_config_id = ?",
            (config_id,),
        )
        # 删除配置
        cur = await db.execute("DELETE FROM strategy_configs WHERE id = ?", (config_id,))
        await db.commit()
    return (cur.rowcount or 0) > 0


def _config_to_dict(row: Any) -> Dict[str, Any]:
    """将数据库行转换为字典"""
    if not row:
        return {}
    data = dict(row)
    try:
        data["config"] = json.loads(data.get("config_json") or "{}")
    except Exception:
        data["config"] = {}
    data.pop("config_json", None)
    data["is_system"] = bool(data.get("is_system"))
    data["enabled"] = bool(data.get("enabled"))
    return data


# ============================================================
# 预设的调度配置模板
# ============================================================

def get_preset_templates() -> List[Dict[str, Any]]:
    """获取预设的调度配置模板"""
    return [
        {
            "name": "master_slave",
            "description": "主从结构：指定一个主智能体和多个从智能体",
            "template_type": "master_slave",
            "config_schema": {
                "topology": {"type": "string", "const": "master_slave", "description": "拓扑类型"},
                "master": {"type": "string", "description": "主智能体ID"},
                "slaves": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "从智能体ID列表"
                },
                "routing": {
                    "type": "string",
                    "enum": ["master_collects", "parallel", "sequential"],
                    "default": "master_collects",
                    "description": "路由方式"
                }
            },
            "example_config": {
                "topology": "master_slave",
                "master": "agent_001",
                "slaves": ["agent_002", "agent_003", "agent_004"],
                "routing": "master_collects"
            }
        },
        {
            "name": "hierarchical",
            "description": "层级结构：多层级组织，每层有多个智能体",
            "template_type": "hierarchical",
            "config_schema": {
                "topology": {"type": "string", "const": "hierarchical"},
                "levels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "level": {"type": "integer", "description": "层级（0为最高）"},
                            "role": {"type": "string", "description": "角色名称"},
                            "agents": {"type": "array", "items": {"type": "string"}, "description": "智能体ID列表"},
                            "report_to": {"type": "integer", "description": "报告给哪一层级"}
                        },
                        "required": ["level", "agents"]
                    },
                    "description": "层级定义"
                }
            },
            "example_config": {
                "topology": "hierarchical",
                "levels": [
                    {"level": 0, "role": "CEO", "agents": ["ceo_agent"], "report_to": None},
                    {"level": 1, "role": "Manager", "agents": ["tech_manager", "sales_manager"], "report_to": 0},
                    {"level": 2, "role": "Worker", "agents": ["dev1", "dev2", "sales1"], "report_to": 1}
                ]
            }
        },
        {
            "name": "swarm",
            "description": "蜂群结构：多个候选智能体并行执行，结果收敛",
            "template_type": "swarm",
            "config_schema": {
                "topology": {"type": "string", "const": "swarm"},
                "agents": {"type": "array", "items": {"type": "string"}, "description": "参与蜂群的智能体"},
                "convergence": {
                    "type": "string",
                    "enum": ["voting", "best_score", "consensus"],
                    "default": "voting",
                    "description": "收敛方式"
                },
                "max_parallel": {"type": "integer", "default": 3, "description": "最大并行数"}
            },
            "example_config": {
                "topology": "swarm",
                "agents": ["agent_a", "agent_b", "agent_c"],
                "convergence": "voting",
                "max_parallel": 3
            }
        },
        {
            "name": "parallel",
            "description": "并行结构：所有智能体同时执行任务",
            "template_type": "parallel",
            "config_schema": {
                "topology": {"type": "string", "const": "parallel"},
                "agents": {"type": "array", "items": {"type": "string"}},
                "merge_strategy": {
                    "type": "string",
                    "enum": ["concat", "summary", "first"],
                    "default": "summary"
                }
            },
            "example_config": {
                "topology": "parallel",
                "agents": ["agent_001", "agent_002"],
                "merge_strategy": "summary"
            }
        },
        {
            "name": "sequential",
            "description": "串行结构：智能体按顺序执行，每个处理完交给下一个",
            "template_type": "sequential",
            "config_schema": {
                "topology": {"type": "string", "const": "sequential"},
                "agents": {"type": "array", "items": {"type": "string"}},
                "pass_context": {"type": "boolean", "default": True, "description": "是否传递上下文"}
            },
            "example_config": {
                "topology": "sequential",
                "agents": ["agent_planner", "agent_executor", "agent_reviewer"],
                "pass_context": True
            }
        }
    ]
