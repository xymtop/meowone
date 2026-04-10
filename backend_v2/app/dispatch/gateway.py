"""
调度网关 —— 请求入口

根据 agent_id / instance_id，从数据库查询调度策略和配置，
构建 DispatchContext（预填充可推导的字段），路由到对应策略执行。

设计原则：
- gateway 层负责预填充所有可推导的字段（agent_runtime、候选池、团队成员等）
- 策略函数优先使用预填充字段，fallback 到自行查询
- 只有无法自动推导的配置才需要用户通过 strategy_config 提供
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

from app.dispatch.context import DispatchContext
from app.dispatch.registry import get_strategy
from app.loop.events import LoopEvent, ErrorEvent, DoneEvent, ThinkingEvent

logger = logging.getLogger(__name__)


async def dispatch(
    *,
    user_message: str,
    history: List[Dict[str, Any]],
    session_id: Optional[str] = None,
    message_id: Optional[str] = None,
    model: Optional[str] = None,
    instance_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    agent_name: Optional[str] = None,
) -> AsyncIterator[LoopEvent]:
    """
    调度网关主入口

    查找顺序：
    1. instance_id → 从 agent_instances 表查策略配置 + image
    2. agent_id / agent_name → 从 agents 表查，使用 direct 策略直接调用
    3. 默认 → 使用 direct 策略，自动推导执行目标
    """
    mid = message_id or str(uuid.uuid4())

    yield ThinkingEvent(step=1, description="正在构建调度上下文...")

    ctx = await _build_context(
        user_message=user_message,
        history=history,
        session_id=session_id,
        message_id=mid,
        model=model,
        instance_id=instance_id,
        agent_id=agent_id,
        agent_name=agent_name,
    )

    # ─── 步骤 2: 查找调度策略 ───

    fn = get_strategy(ctx.strategy_name)
    if fn is None:
        logger.warning("找不到调度策略: %s，fallback 到 direct", ctx.strategy_name)
        fn = get_strategy("direct")

    if fn is None:
        yield ErrorEvent(code="NO_STRATEGY", message=f"No strategy registered: {ctx.strategy_name}")
        yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=0)
        return

    # ─── 步骤 3: 开始调度 ───
    logger.info(
        "dispatch: strategy=%s agent_id=%s instance_id=%s image_id=%s",
        ctx.strategy_name, ctx.agent_id, ctx.instance_id, ctx.image_id,
    )

    async for event in fn(ctx):
        yield event


async def _build_context(
    *,
    user_message: str,
    history: List[Dict[str, Any]],
    session_id: Optional[str],
    message_id: str,
    model: Optional[str],
    instance_id: Optional[str],
    agent_id: Optional[str],
    agent_name: Optional[str],
) -> DispatchContext:
    """
    构建 DispatchContext，并预填充所有可推导的字段。

    填充顺序（按优先级递减）：
    1. 入口 agent_id / instance_id → 查表得到 image_id
    2. image_id → 查镜像得到 agent_ids_json
    3. agent_id → 构建 agent_runtime
    4. image.agent_ids_json → 构建候选智能体运行时列表
    5. strategy_config.team_id → 预加载团队成员运行时列表
    """
    from app.agents.builder import agent_builder
    from app.db.queries.agent_instances import get_agent_instance_by_id, get_agent_image_by_id
    from app.db.queries.agents import get_agent_by_id, get_agent_by_name

    strategy_name: str = "direct"
    strategy_config: Dict[str, Any] = {}

    resolved_agent_id: Optional[str] = None
    resolved_image_id: Optional[str] = None

    # ─── 1. 通过 instance_id 解析 ───
    if instance_id:
        strategy_name, strategy_config, resolved_agent_id, resolved_image_id = \
            await _resolve_from_instance(instance_id)

    # ─── 2. 通过 agent_id / agent_name 解析 ───
    if not resolved_agent_id and (agent_id or agent_name):
        resolved_agent_id = agent_id or ""
        if agent_name and not resolved_agent_id:
            row = await get_agent_by_name(agent_name)
            if row:
                resolved_agent_id = str(row.get("id") or "")

        if resolved_agent_id:
            agent_row = await get_agent_by_id(resolved_agent_id)
            if agent_row:
                meta = agent_row.get("metadata_json") or {}
                strategy_name = str(meta.get("scheduler_mode") or "direct")
                # 尝试从 agent.metadata_json 中取 image_id
                if not resolved_image_id:
                    resolved_image_id = str(meta.get("image_id") or "")
            else:
                # agent_id 找不到 → 可能是 instance_id，回退到 instance → image → agent_ids
                instance = await get_agent_instance_by_id(resolved_agent_id)
                if instance:
                    inst_image_id = str(instance.get("image_id") or "").strip()
                    if inst_image_id:
                        image = await get_agent_image_by_id(inst_image_id)
                        if image:
                            resolved_image_id = inst_image_id
                            agent_ids = image.get("agent_ids_json") or []
                            if agent_ids:
                                resolved_agent_id = str(agent_ids[0])
                                agent_row = await get_agent_by_id(resolved_agent_id)
                                if agent_row:
                                    meta = agent_row.get("metadata_json") or {}
                                    strategy_name = str(meta.get("scheduler_mode") or "direct")
                                    if not resolved_image_id:
                                        resolved_image_id = str(meta.get("image_id") or "")

    # ─── 3. 如果有 resolved_agent_id，尝试获取 image_id（从 agent 所属镜像）───
    if not resolved_image_id and resolved_agent_id:
        agent_row = await get_agent_by_id(resolved_agent_id)
        if agent_row:
            meta = agent_row.get("metadata_json") or {}
            resolved_image_id = str(meta.get("image_id") or "")

    # ─── 预填充字段初始化 ───
    agent_runtime = None
    candidate_runtimes: List[Any] = []

    if resolved_agent_id:
        agent_runtime = await agent_builder.build_by_id(resolved_agent_id)

    # ─── 有 image_id 时，从 agent_ids_json 预填充候选智能体 ───
    if resolved_image_id and not candidate_runtimes:
        image = await get_agent_image_by_id(resolved_image_id)
        if image:
            agent_ids = image.get("agent_ids_json") or []
            for aid in agent_ids:
                r = await agent_builder.build_by_id(aid)
                if r:
                    # 第一个作为 agent_runtime
                    if agent_runtime is None:
                        agent_runtime = r
                    candidate_runtimes.append(r)

    return DispatchContext(
        user_message=user_message,
        history=history,
        session_id=session_id,
        message_id=message_id,
        strategy_name=strategy_name,
        strategy_config=strategy_config,
        model=model,
        agent_id=resolved_agent_id,
        instance_id=instance_id,
        image_id=resolved_image_id,
        agent_runtime=agent_runtime,
        candidate_runtimes=candidate_runtimes,
    )


async def _resolve_from_instance(
    instance_id: str,
) -> tuple[str, Dict[str, Any], Optional[str], Optional[str]]:
    """
    从 instance 解析策略配置和关联的 agent_id / image_id。

    Returns:
        (strategy_name, strategy_config, resolved_agent_id, resolved_image_id)
    """
    from app.db.queries.agent_instances import get_agent_instance_by_id, get_agent_image_by_id
    from app.db.queries.strategies import get_strategy_config_by_id

    try:
        instance = await get_agent_instance_by_id(instance_id)
        if not instance:
            return "direct", {}, None, None

        instance_config: Dict[str, Any] = instance.get("strategy_config_json") or {}
        if isinstance(instance_config, str):
            try:
                instance_config = json.loads(instance_config)
            except Exception:
                instance_config = {}

        resolved_image_id: Optional[str] = str(instance.get("image_id") or "").strip() or None

        # ① 实例绑定了 strategy_config_id → 从 strategy_configs 表查
        strategy_config_id = str(instance.get("strategy_config_id") or "").strip()
        if strategy_config_id:
            sc = await get_strategy_config_by_id(strategy_config_id)
            if sc:
                config: Dict[str, Any] = sc.get("config_json") or {}
                config.update(instance_config)
                # strategy_id 是 UUID，需要转成策略名称（如 "team_dispatch"）
                strategy_id = str(sc.get("strategy_id") or "").strip()
                strategy_name = await _strategy_name_by_id(strategy_id) if strategy_id else "direct"
                if strategy_name:
                    return strategy_name, config, None, resolved_image_id

        # ② 从镜像查默认策略配置
        if resolved_image_id:
            image = await get_agent_image_by_id(resolved_image_id)
            if image:
                image_config: Dict[str, Any] = image.get("metadata_json") or {}
                if isinstance(image_config, str):
                    try:
                        image_config = json.loads(image_config)
                    except Exception:
                        image_config = {}
                image_config.update(instance_config)

                strategy_name = await _strategy_name_from_image(resolved_image_id)
                return strategy_name or "direct", image_config, None, resolved_image_id

        # ③ 实例只有 image_id 且没有策略 → 取第一个 agent 用 direct
        if resolved_image_id:
            image = await get_agent_image_by_id(resolved_image_id)
            if image:
                agent_ids = image.get("agent_ids_json") or []
                if agent_ids:
                    merged = {"agent_id": agent_ids[0]}
                    merged.update(instance_config)
                    return "direct", merged, agent_ids[0], resolved_image_id

    except Exception as e:
        logger.exception("从 instance 解析策略失败: %s", e)

    return "direct", {}, None, None


async def _strategy_name_from_image(image_id: Optional[str]) -> str:
    if not image_id:
        return "direct"
    try:
        from app.db.queries.agent_instances import get_agent_image_by_id
        image = await get_agent_image_by_id(image_id)
        if not image:
            return "direct"
        strategy_id = str(image.get("strategy_id") or "").strip()
        if strategy_id:
            return await _strategy_name_by_id(strategy_id)
        return "direct"
    except Exception:
        return "direct"


async def _strategy_name_by_id(strategy_id: str) -> str:
    if not strategy_id:
        return "direct"
    try:
        from app.db.connection import get_db
        async with get_db() as db:
            cur = await db.execute("SELECT name FROM strategies WHERE id = ?", (strategy_id,))
            row = await cur.fetchone()
            return str(row[0]) if row else "direct"
    except Exception:
        return "direct"


def import_all_strategies() -> None:
    """导入所有策略模块以触发 @dispatch_strategy 注册"""
    import app.dispatch.strategies.direct  # noqa: F401
    import app.dispatch.strategies.team_dispatch  # noqa: F401
    import app.dispatch.strategies.capability_match  # noqa: F401
