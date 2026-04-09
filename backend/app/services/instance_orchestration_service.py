"""
实例编排服务 (Instance Orchestration Service)

当用户与实例对话时，根据镜像配置进行多智能体调度。

核心流程：
1. 加载实例 → 获取镜像 → 获取智能体列表
2. 根据调度配置（strategy_config）构建执行计划
3. 多智能体协作执行
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db
from app.services import agent_service


# ============================================================
# 调度配置解析
# ============================================================

def parse_strategy_config(config: Dict[str, Any], agent_map: Dict[str, Dict]) -> Dict[str, Any]:
    """解析调度配置，返回执行计划
    
    Args:
        config: 调度配置内容
        agent_map: agent_id -> agent_info 的映射
    
    Returns:
        执行计划，包含拓扑和路由信息
    """
    topology = config.get("topology", "direct")
    
    if topology == "master_slave":
        return _parse_master_slave(config, agent_map)
    elif topology == "hierarchical":
        return _parse_hierarchical(config, agent_map)
    elif topology == "swarm":
        return _parse_swarm(config, agent_map)
    elif topology == "parallel":
        return _parse_parallel(config, agent_map)
    elif topology == "sequential":
        return _parse_sequential(config, agent_map)
    else:
        # 默认 direct 模式
        return {
            "topology": "direct",
            "type": "direct",
            "agents": list(agent_map.keys()),
        }


def _parse_master_slave(config: Dict[str, Any], agent_map: Dict[str, Dict]) -> Dict[str, Any]:
    """解析主从结构"""
    master = config.get("master")
    slaves = config.get("slaves", [])
    routing = config.get("routing", "master_collects")
    
    return {
        "topology": "master_slave",
        "type": "master_slave",
        "master": master,
        "slaves": slaves,
        "routing": routing,
        "agents": [master] + slaves if master else slaves,
        "description": f"主从结构：master={master}, slaves={slaves}, routing={routing}"
    }


def _parse_hierarchical(config: Dict[str, Any], agent_map: Dict[str, Dict]) -> Dict[str, Any]:
    """解析层级结构"""
    levels = config.get("levels", [])
    all_agents = []
    
    for level in levels:
        level_agents = level.get("agents", [])
        all_agents.extend(level_agents)
    
    return {
        "topology": "hierarchical",
        "type": "hierarchical",
        "levels": levels,
        "agents": all_agents,
        "description": f"层级结构：{len(levels)} 层"
    }


def _parse_swarm(config: Dict[str, Any], agent_map: Dict[str, Dict]) -> Dict[str, Any]:
    """解析蜂群结构"""
    agents = config.get("agents", [])
    convergence = config.get("convergence", "voting")
    max_parallel = config.get("max_parallel", 3)
    
    return {
        "topology": "swarm",
        "type": "swarm",
        "agents": agents,
        "convergence": convergence,
        "max_parallel": max_parallel,
        "description": f"蜂群结构：{len(agents)} 个候选，收敛方式={convergence}"
    }


def _parse_parallel(config: Dict[str, Any], agent_map: Dict[str, Dict]) -> Dict[str, Any]:
    """解析并行结构"""
    agents = config.get("agents", [])
    merge_strategy = config.get("merge_strategy", "summary")
    
    return {
        "topology": "parallel",
        "type": "parallel",
        "agents": agents,
        "merge_strategy": merge_strategy,
        "description": f"并行结构：{len(agents)} 个智能体并行"
    }


def _parse_sequential(config: Dict[str, Any], agent_map: Dict[str, Any]) -> Dict[str, Any]:
    """解析串行结构"""
    agents = config.get("agents", [])
    pass_context = config.get("pass_context", True)
    
    return {
        "topology": "sequential",
        "type": "sequential",
        "agents": agents,
        "pass_context": pass_context,
        "description": f"串行结构：{len(agents)} 个智能体顺序执行"
    }


# ============================================================
# 实例配置加载
# ============================================================

async def load_instance_config(instance_id: str) -> Optional[Dict[str, Any]]:
    """加载实例的完整配置
    
    Returns:
        包含实例、镜像、智能体列表、调度配置的完整信息
    """
    from app.services.agent_image_service import get_agent_instance_by_id
    
    instance = await get_agent_instance_by_id(instance_id)
    if not instance:
        return None
    
    return instance


async def load_instance_for_chat(instance_id: str) -> Optional[Dict[str, Any]]:
    """为对话加载实例配置
    
    返回适合对话使用的信息：
    - 镜像中的智能体列表
    - 调度配置（拓扑）
    - 环境配置
    - 使用的模型
    """
    instance = await load_instance_config(instance_id)
    if not instance:
        return None
    
    image = instance.get("image", {})
    if not image:
        return None
    
    # 获取镜像中的智能体详情
    image_agents = instance.get("agents", [])
    
    # 构建 agent_id -> agent_info 映射
    agent_map: Dict[str, Dict[str, Any]] = {}
    for agent in image_agents:
        agent_id = str(agent.get("id", ""))
        agent_map[agent_id] = agent
    
    # 解析调度配置
    strategy_config = image.get("strategy_config", {})
    strategy_config_id = image.get("strategy_config_id")
    
    # 如果有 strategy_config_id，优先使用关联的配置
    if strategy_config_id and not strategy_config:
        from app.services.strategy_config_service import get_strategy_config_by_id
        config_record = await get_strategy_config_by_id(strategy_config_id)
        if config_record:
            strategy_config = config_record.get("config", {})
    
    # 构建执行计划
    execution_plan = parse_strategy_config(strategy_config, agent_map)
    
    # 获取 Loop 配置
    loop_id = image.get("loop_id")
    loop_config = None
    if loop_id:
        from app.services.v3_service import get_loop_by_id
        loop_config = await get_loop_by_id(loop_id)
    
    # 获取策略配置
    strategy_id = image.get("strategy_id")
    strategy_info = None
    if strategy_id:
        from app.services.v3_service import get_strategy_by_id
        strategy_info = await get_strategy_by_id(strategy_id)
    
    # 获取环境配置
    environment = instance.get("environment")
    
    # 合并结果
    result = {
        "instance_id": instance_id,
        "instance_name": instance.get("name"),
        "image_id": image.get("id"),
        "image_name": image.get("name"),
        # 智能体
        "agents": image_agents,
        "agent_map": agent_map,
        "agent_ids": [a.get("id") for a in image_agents],
        # 调度配置
        "strategy_config": strategy_config,
        "strategy_config_id": strategy_config_id,
        "execution_plan": execution_plan,
        "strategy_id": strategy_id,
        "strategy_info": strategy_info,
        # Loop 配置
        "loop_id": loop_id,
        "loop_config": loop_config,
        # 环境配置
        "environment": environment,
        "environment_id": instance.get("environment_id") or image.get("environment_id"),
        # 模型配置
        "model_name": instance.get("model_name") or "",
        # 运行时配置
        "runtime_config": instance.get("runtime_config", {}),
    }
    
    return result


# ============================================================
# 辅助函数
# ============================================================

def get_agent_by_id_from_map(agent_map: Dict[str, Dict], agent_id: str) -> Optional[Dict[str, Any]]:
    """从 agent_map 中获取智能体信息"""
    return agent_map.get(agent_id)


def format_execution_plan_for_display(execution_plan: Dict[str, Any]) -> str:
    """格式化执行计划为可读字符串"""
    desc = execution_plan.get("description", "")
    topology = execution_plan.get("topology", "direct")
    
    if topology == "master_slave":
        master = execution_plan.get("master", "N/A")
        slaves = execution_plan.get("slaves", [])
        return f"主从模式 | 主智能体: {master} | 从智能体: {', '.join(slaves) or '无'}"
    elif topology == "hierarchical":
        levels = execution_plan.get("levels", [])
        level_desc = []
        for lvl in levels:
            role = lvl.get("role", f"Level {lvl.get('level', '?')}")
            agents = lvl.get("agents", [])
            level_desc.append(f"{role}({', '.join(agents)})")
        return f"层级模式 | {' → '.join(level_desc)}"
    elif topology == "swarm":
        agents = execution_plan.get("agents", [])
        convergence = execution_plan.get("convergence", "voting")
        return f"蜂群模式 | 候选: {', '.join(agents) or '无'} | 收敛: {convergence}"
    elif topology == "parallel":
        agents = execution_plan.get("agents", [])
        return f"并行模式 | {', '.join(agents) or '无'}"
    elif topology == "sequential":
        agents = execution_plan.get("agents", [])
        return f"串行模式 | {' → '.join(agents) or '无'}"
    else:
        agents = execution_plan.get("agents", [])
        return f"直接模式 | {', '.join(agents) or '无'}"
