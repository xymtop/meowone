"""
调度网关 —— 请求入口

根据 agent_id 或 instance_id，从数据库查询调度策略和配置，
构建 DispatchContext，路由到对应的策略函数执行。

这是所有聊天请求的统一调度入口。
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

from app.dispatch.context import DispatchContext
from app.dispatch.registry import get_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent

logger = logging.getLogger(__name__)


async def dispatch(
    *,
    user_message: str,
    history: List[Dict[str, Any]],
    session_id: Optional[str] = None,
    message_id: Optional[str] = None,
    model: Optional[str] = None,
    # 路由目标：优先 instance_id，其次 agent_id，最后 agent_name
    instance_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
) -> AsyncIterator[LoopEvent]:
    """
    调度网关主入口

    查找顺序：
    1. instance_id → 从 agent_instances 表查策略配置
    2. agent_id / agent_name → 从 agents 表查，使用 direct 策略直接调用
    3. 默认 → 使用全局默认智能体（或返回错误）
    """
    mid = message_id or str(uuid.uuid4())
    strategy_name, strategy_config = await _resolve_strategy(
        instance_id=instance_id,
        agent_id=agent_id,
        agent_name=agent_name,
    )

    ctx = DispatchContext(
        user_message=user_message,
        history=history,
        session_id=session_id,
        message_id=mid,
        strategy_name=strategy_name,
        strategy_config=strategy_config,
        model=model,
    )

    fn = get_strategy(strategy_name)
    if fn is None:
        logger.warning("找不到调度策略: %s，fallback 到 direct", strategy_name)
        fn = get_strategy("direct")

    if fn is None:
        yield ErrorEvent(code="NO_STRATEGY", message=f"No strategy registered: {strategy_name}")
        yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=0)
        return

    logger.info(
        "dispatch: strategy=%s agent_id=%s instance_id=%s",
        strategy_name, agent_id, instance_id,
    )
    async for event in fn(ctx):
        yield event


async def _resolve_strategy(
    instance_id: Optional[str],
    agent_id: Optional[str],
    agent_name: Optional[str],
) -> tuple[str, Dict[str, Any]]:
    """
    从数据库解析调度策略和配置

    Returns:
        (strategy_name, strategy_config_dict)
    """
    # 1. 通过 instance_id 查询
    if instance_id:
        strategy, config = await _strategy_from_instance(instance_id)
        if strategy:
            return strategy, config

    # 2. agent_id 或 agent_name → 从数据库读取 scheduler_mode
    if agent_id or agent_name:
        strategy_name = await _strategy_name_from_agent(
            agent_id=agent_id,
            agent_name=agent_name,
        )
        config: Dict[str, Any] = {}
        if agent_id:
            config["agent_id"] = agent_id
        if agent_name:
            config["agent_name"] = agent_name
        return strategy_name or "direct", config

    # 3. 没有任何目标 → 返回错误配置（由 direct 策略处理）
    return "direct", {}


async def _strategy_from_instance(instance_id: str) -> tuple[str, Dict[str, Any]]:
    """从 agent_instances 表解析策略"""
    try:
        from app.db.queries.agent_instances import get_agent_instance_by_id, get_agent_image_by_id
        from app.db.queries.strategies import get_strategy_config_by_id, get_strategy_config_by_image

        instance = await get_agent_instance_by_id(instance_id)
        if not instance:
            return "", {}

        # 优先：实例自身的 strategy_config_json
        instance_config = instance.get("strategy_config_json") or {}
        if isinstance(instance_config, str):
            try:
                instance_config = json.loads(instance_config)
            except Exception:
                instance_config = {}

        # 实例绑定了 strategy_config_id → 从 strategy_configs 表查
        strategy_config_id = str(instance.get("strategy_config_id") or "").strip()
        if strategy_config_id:
            sc = await get_strategy_config_by_id(strategy_config_id)
            if sc:
                config = sc.get("config_json") or {}
                # 合并实例级别的覆盖
                config.update(instance_config)
                # 查策略名称
                strategy_name = await _strategy_name_from_image(instance.get("image_id"))
                return strategy_name or "direct", config

        # 从镜像查默认策略配置
        image_id = str(instance.get("image_id") or "").strip()
        if image_id:
            image = await get_agent_image_by_id(image_id)
            if image:
                # 镜像自带的策略配置 JSON
                image_config = image.get("strategy_config_json") or {}
                if isinstance(image_config, str):
                    try:
                        image_config = json.loads(image_config)
                    except Exception:
                        image_config = {}
                image_config.update(instance_config)

                # 查镜像绑定的策略名称
                strategy_id = str(image.get("strategy_id") or "").strip()
                strategy_name = await _strategy_name_by_id(strategy_id)
                return strategy_name or "direct", image_config

        # 实例只有 agent_ids_json 没有策略 → 取第一个 agent 用 direct
        if image_id:
            image = await get_agent_image_by_id(image_id)
            if image:
                agent_ids = image.get("agent_ids_json") or []
                if agent_ids:
                    merged = {"agent_id": agent_ids[0]}
                    merged.update(instance_config)
                    return "direct", merged

    except Exception as e:
        logger.exception("解析 instance 策略失败: %s", e)

    return "", {}


async def _strategy_name_from_image(image_id: Optional[str]) -> str:
    if not image_id:
        return ""
    try:
        from app.db.queries.agent_instances import get_agent_image_by_id
        image = await get_agent_image_by_id(image_id)
        if not image:
            return ""
        strategy_id = str(image.get("strategy_id") or "").strip()
        return await _strategy_name_by_id(strategy_id)
    except Exception:
        return ""


async def _strategy_name_by_id(strategy_id: str) -> str:
    if not strategy_id:
        return ""
    try:
        from app.db.connection import get_db
        async with get_db() as db:
            cur = await db.execute("SELECT name FROM strategies WHERE id = ?", (strategy_id,))
            row = await cur.fetchone()
            return str(row[0]) if row else ""
    except Exception:
        return ""


async def _strategy_name_from_agent(
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
) -> str:
    """
    根据 agent_id 或 agent_name 查询数据库，返回其配置的 scheduler_mode。
    如果数据库中没有配置调度策略（即 scheduler_mode 为空），默认返回 "direct"。
    """
    try:
        from app.db.connection import get_db

        if agent_id:
            async with get_db() as db:
                cur = await db.execute(
                    "SELECT metadata_json FROM agents WHERE id = ? LIMIT 1",
                    (agent_id.strip(),),
                )
                row = await cur.fetchone()
                if row:
                    raw = row[0] or "{}"
                    try:
                        meta = json.loads(raw)
                        scheduler = meta.get("scheduler_mode", "direct") if isinstance(meta, dict) else "direct"
                        return scheduler if scheduler else "direct"
                    except Exception:
                        pass
            return "direct"

        if agent_name:
            async with get_db() as db:
                cur = await db.execute(
                    "SELECT metadata_json FROM agents WHERE name = ? LIMIT 1",
                    (agent_name.strip(),),
                )
                row = await cur.fetchone()
                if row:
                    raw = row[0] or "{}"
                    try:
                        meta = json.loads(raw)
                        scheduler = meta.get("scheduler_mode", "direct") if isinstance(meta, dict) else "direct"
                        return scheduler if scheduler else "direct"
                    except Exception:
                        pass
            return "direct"

    except Exception:
        pass

    return "direct"


def import_all_strategies() -> None:
    """导入所有策略模块以触发 @dispatch_strategy 注册"""
    import app.dispatch.strategies.direct  # noqa: F401
    import app.dispatch.strategies.team_dispatch  # noqa: F401
    import app.dispatch.strategies.capability_match  # noqa: F401
