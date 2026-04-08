from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List

from app.capability.registry import CapabilityRegistry
from app.capability.runtime import CapabilityFilter, CapabilityRuntime
from app.config_loaders import build_extra_system_prompt, load_channels_config, load_scheduler_config
from app.loop.context import UserContent
from app.loop.events import (
    CardEvent,
    DeltaEvent,
    DoneEvent,
    ErrorEvent,
    LoopEvent,
    ThinkingEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from app.loop.input import LoopRunInput
from app.loop.input import LoopLimits
from app.scheduler.executor import execute_scheduled_turn
from app.scheduler.planner import build_execution_plan
from app.scheduler.registry import scheduler_registry
from app.services import message_service
from app.db.database import get_db


class ConversationTurnService:
    """Application service: one user turn -> loop stream -> persistence."""

    def __init__(self, capabilities: CapabilityRegistry) -> None:
        self.capabilities = capabilities
        self.capability_runtime = CapabilityRuntime(capabilities)

    async def _load_agent_config(self, agent_name: str, agent_type: str) -> Dict[str, Any] | None:
        """从数据库加载 agent 配置"""
        try:
            async with get_db() as db:
                cursor = await db.execute(
                    "SELECT * FROM agents WHERE name = ? AND agent_type = ?",
                    (agent_name, agent_type),
                )
                row = await cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception:
            return None

    async def _build_history(self, session_id: str, exclude_content: str) -> List[Dict[str, Any]]:
        history_rows = await message_service.get_context_messages(session_id, limit=20)
        history: List[Dict[str, Any]] = []
        for row in history_rows:
            if row["role"] in ("user", "assistant") and row["content"]:
                history.append({"role": row["role"], "content": row["content"]})
        if history and history[-1]["content"] == exclude_content:
            history = history[:-1]
        return history

    async def stream_turn(
        self,
        session_id: str,
        user_content: UserContent,
        exclude_for_history: str,
        *,
        channel_id: str = "web",
        scheduler_mode: str | None = None,
        task_tag: str | None = None,
        capability_filter: CapabilityFilter | None = None,
        limits: LoopLimits | None = None,
        agent_name: str | None = None,
        agent_type: str | None = None,
    ) -> AsyncIterator[Dict[str, str]]:
        # 如果指定了 agent_name，从数据库加载 agent 配置
        extra_system = ""
        if agent_name:
            agent_cfg = await self._load_agent_config(agent_name, agent_type or "internal")
            if agent_cfg:
                # 合并 agent 的 system_prompt 和 prompt_key
                if agent_cfg.get("system_prompt"):
                    extra_system = agent_cfg["system_prompt"]
                if agent_cfg.get("prompt_key"):
                    # TODO: 从 prompts 表加载 prompt_key 对应的内容并追加
                    pass
        
        history = await self._build_history(session_id, exclude_content=exclude_for_history)
        effective_filter = capability_filter
        if effective_filter is None:
            by_channel = load_channels_config().get(channel_id) or {}
            allow = by_channel.get("allow_tools") or None
            deny = by_channel.get("deny_tools") or None
            if allow or deny:
                effective_filter = CapabilityFilter(allow_names=allow, deny_names=deny)
        scheduler_cfg = load_scheduler_config()
        requested_mode = (scheduler_mode or "").strip()
        if not requested_mode and task_tag:
            by_task_tag = (
                (scheduler_cfg.get("routing") or {}).get("by_task_tag") or {}
                if isinstance(scheduler_cfg, dict)
                else {}
            )
            if isinstance(by_task_tag, dict):
                requested_mode = str(by_task_tag.get(task_tag) or "").strip()
        if not requested_mode:
            by_channel_mode = (
                (scheduler_cfg.get("routing") or {}).get("by_channel") or {}
                if isinstance(scheduler_cfg, dict)
                else {}
            )
            if isinstance(by_channel_mode, dict):
                requested_mode = str(by_channel_mode.get(channel_id) or "").strip()
            if not requested_mode:
                requested_mode = str(scheduler_cfg.get("default_mode") or "direct").strip()
        schedule = scheduler_registry.decide(requested_mode)
        execution_plan = build_execution_plan(mode=schedule.mode, task_tag=task_tag)
        if schedule.capability_filter:
            base_allow = list(effective_filter.allow_names) if effective_filter and effective_filter.allow_names else []
            base_deny = list(effective_filter.deny_names) if effective_filter and effective_filter.deny_names else []
            mode_allow = list(schedule.capability_filter.allow_names or [])
            mode_deny = list(schedule.capability_filter.deny_names or [])
            merged_allow = base_allow or mode_allow or None
            merged_deny = list(dict.fromkeys(base_deny + mode_deny)) or None
            effective_filter = CapabilityFilter(allow_names=merged_allow, deny_names=merged_deny)
        selected_caps = self.capability_runtime.resolve(
            filter=effective_filter,
            channel_id=channel_id,
        )
        # 如果没有通过 agent 配置加载 system_prompt，则使用默认的
        if not extra_system:
            extra_system = build_extra_system_prompt()
        else:
            # Agent 的 system_prompt 已有，追加默认的
            default_system = build_extra_system_prompt()
            if default_system:
                extra_system = extra_system + "\n\n" + default_system
        if schedule.system_hint:
            extra_system = (extra_system + "\n\n" + schedule.system_hint).strip()
        yield {
            "event": "thinking",
            "data": json.dumps(
                {
                    "step": 0,
                    "description": f"Scheduler selected: {schedule.mode}",
                    "schedulerMode": schedule.mode,
                    "executionPlan": execution_plan.to_event_payload(),
                }
            ),
        }
        run_input = LoopRunInput(
            user_message=user_content,
            history=history,
            capabilities=selected_caps,
            extra_system=extra_system,
            limits=limits,
        )

        accumulated_text = ""
        cards: List[Dict[str, Any]] = []

        async for event in execute_scheduled_turn(
            mode=schedule.mode,
            run_input=run_input,
            task_tag=task_tag,
        ):
            payload = await self._to_sse_payload(
                session_id=session_id,
                event=event,
                accumulated_text_ref={"value": accumulated_text},
                cards=cards,
            )
            if isinstance(event, DeltaEvent) and event.content:
                accumulated_text += event.content
            if payload is not None:
                yield payload

    async def _to_sse_payload(
        self,
        session_id: str,
        event: LoopEvent,
        accumulated_text_ref: Dict[str, str],
        cards: List[Dict[str, Any]],
    ) -> Dict[str, str] | None:
        if isinstance(event, ThinkingEvent):
            return {
                "event": "thinking",
                "data": json.dumps({"step": event.step, "description": event.description}),
            }
        if isinstance(event, DeltaEvent):
            return {
                "event": "delta",
                "data": json.dumps(
                    {
                        "messageId": event.message_id,
                        "content": event.content,
                        "done": event.done,
                    }
                ),
            }
        if isinstance(event, CardEvent):
            cards.append(event.card)
            return {
                "event": "card",
                "data": json.dumps(
                    {
                        "messageId": event.message_id,
                        "card": event.card,
                    }
                ),
            }
        if isinstance(event, ToolCallEvent):
            return {
                "event": "tool_call",
                "data": json.dumps(
                    {
                        "toolCallId": event.tool_call_id,
                        "name": event.capability_name,
                    }
                ),
            }
        if isinstance(event, ToolResultEvent):
            return {
                "event": "tool_result",
                "data": json.dumps(
                    {
                        "toolCallId": event.tool_call_id,
                        "name": event.capability_name,
                        "ok": event.success,
                    }
                ),
            }
        if isinstance(event, ErrorEvent):
            return {
                "event": "error",
                "data": json.dumps({"code": event.code, "message": event.message}),
            }
        if isinstance(event, DoneEvent):
            accumulated_text = accumulated_text_ref["value"]
            if accumulated_text or cards:
                card_data = None
                content_type = "text"
                if cards:
                    content_type = "card" if len(cards) == 1 else "cards"
                    card_data = json.dumps(cards[0] if len(cards) == 1 else cards, ensure_ascii=False)

                await message_service.create_message(
                    session_id=session_id,
                    role="assistant",
                    content_type=content_type,
                    content=accumulated_text if accumulated_text else None,
                    card_data=card_data,
                )

            return {
                "event": "done",
                "data": json.dumps(
                    {
                        "messageId": event.message_id,
                        "loopRounds": event.loop_rounds,
                        "totalDuration": event.total_duration,
                    }
                ),
            }
        return None

