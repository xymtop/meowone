from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

from app.bootstrap.capabilities import DISPATCH_TOOL_NAMES, REMOTE_AGENT_TOOL_PREFIX
from app.capability.registry import CapabilityRegistry
from app.capability.runtime import CapabilityFilter, CapabilityRuntime
from app.config_loaders import build_extra_system_prompt, load_channels_config, load_scheduler_config
from app.loop.runtime import DEFAULT_LOOP_MODE, SUPPORTED_LOOP_MODES
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
from app.services import message_service, prompt_service


class ConversationTurnService:
    """Application service: one user turn -> loop stream -> persistence."""

    def __init__(self, capabilities: CapabilityRegistry) -> None:
        self.capabilities = capabilities
        self.capability_runtime = CapabilityRuntime(capabilities)

    async def _load_agent_config(self, agent_name: str, agent_type: str) -> Dict[str, Any] | None:
        """从数据库加载 agent 配置（含 metadata_json 解析出的 model_name）。"""
        from app.services import agent_service

        return await agent_service.get_agent(name=agent_name, agent_type=agent_type)

    async def _load_prompt_content(self, prompt_key: str) -> str:
        """根据 prompt_key 加载提示词内容"""
        if not prompt_key:
            return ""
        try:
            prompt = await prompt_service.get_prompt(prompt_key)
            if prompt and prompt.get("content_md"):
                return prompt["content_md"]
        except Exception:
            pass
        return ""

    def _parse_json_list(self, value: Optional[str]) -> List[str]:
        """解析 JSON 字符串列表"""
        if not value:
            return []
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(x) for x in parsed if str(x).strip()]
        except (json.JSONDecodeError, TypeError):
            pass
        return []

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
        agent_id: str | None = None,
        model_name: str | None = None,
    ) -> AsyncIterator[Dict[str, str]]:
        from app.services import agent_service

        extra_system = ""
        agent_capability_filter: Optional[CapabilityFilter] = None
        llm_model: str | None = (model_name or "").strip() or None
        agent_loop_mode: str = DEFAULT_LOOP_MODE
        allow_tools: List[str] = []
        deny_tools: List[str] = []

        agent_cfg: Dict[str, Any] | None = None
        if agent_id and str(agent_id).strip():
            agent_cfg = await agent_service.get_agent_by_id(str(agent_id).strip())
        if agent_cfg is None and agent_name and str(agent_name).strip():
            agent_cfg = await self._load_agent_config(str(agent_name).strip(), (agent_type or "internal").strip())

        agent_label = str(agent_cfg.get("name") or agent_name or "agent") if agent_cfg else ""

        if agent_cfg:
            if agent_cfg.get("system_prompt"):
                extra_system = str(agent_cfg.get("system_prompt") or "")

            agent_prompt_key = agent_cfg.get("prompt_key") or ""
            if agent_prompt_key:
                prompt_content = await self._load_prompt_content(str(agent_prompt_key))
                if prompt_content:
                    extra_system = (extra_system + "\n\n" + prompt_content).strip()

            mcp_servers = self._parse_json_list(agent_cfg.get("mcp_servers"))
            agent_skills = self._parse_json_list(agent_cfg.get("agent_skills"))
            allow_tools = self._parse_json_list(agent_cfg.get("allow_tools"))
            deny_tools = self._parse_json_list(agent_cfg.get("deny_tools"))

            meta_model = str(agent_cfg.get("model_name") or "").strip()
            if meta_model:
                llm_model = meta_model

            # 从 metadata_json 中读取 loop_mode
            agent_loop_mode: str = DEFAULT_LOOP_MODE
            metadata = agent_cfg.get("metadata_json") or {}
            if isinstance(metadata, str) and metadata:
                metadata = json.loads(metadata)
            raw_loop_mode = str(metadata.get("loop_mode") or "").strip()
            if raw_loop_mode and raw_loop_mode in SUPPORTED_LOOP_MODES:
                agent_loop_mode = raw_loop_mode

            if mcp_servers or agent_skills or allow_tools or deny_tools:
                base_allowed: List[str] = []
                if mcp_servers:
                    base_allowed.extend(["list_mcp_tools", "call_mcp_tool"])
                if agent_skills:
                    base_allowed.append("load_agent_skill")

                if deny_tools:
                    if allow_tools:
                        all_allowed = list(dict.fromkeys(base_allowed + allow_tools))
                        agent_capability_filter = CapabilityFilter(allow_names=all_allowed, deny_names=deny_tools)
                    elif base_allowed:
                        agent_capability_filter = CapabilityFilter(allow_names=base_allowed, deny_names=deny_tools)
                    else:
                        agent_capability_filter = CapabilityFilter(allow_names=None, deny_names=deny_tools)
                elif allow_tools:
                    all_allowed = list(dict.fromkeys(base_allowed + allow_tools))
                    agent_capability_filter = CapabilityFilter(allow_names=all_allowed, deny_names=None)
                elif base_allowed:
                    agent_capability_filter = CapabilityFilter(allow_names=base_allowed, deny_names=None)
                else:
                    agent_capability_filter = CapabilityFilter(allow_names=allow_tools, deny_names=None)
            else:
                # 智能体未配置任何工具策略时，主模型由下方的调度层过滤接管
                pass

            if mcp_servers:
                yield {
                    "event": "thinking",
                    "data": json.dumps(
                        {"step": -1, "description": f"Agent {agent_label} configured with {len(mcp_servers)} MCP servers"}
                    ),
                }
            if agent_skills:
                yield {
                    "event": "thinking",
                    "data": json.dumps(
                        {"step": -1, "description": f"Agent {agent_label} configured with {len(agent_skills)} skills"}
                    ),
                }

        history = await self._build_history(session_id, exclude_content=exclude_for_history)

        effective_filter = capability_filter
        if effective_filter is None:
            by_channel = load_channels_config().get(channel_id) or {}
            allow = by_channel.get("allow_tools") or None
            deny = by_channel.get("deny_tools") or None
            if allow or deny:
                effective_filter = CapabilityFilter(allow_names=allow, deny_names=deny)

        if agent_capability_filter:
            base_allow = list(effective_filter.allow_names) if effective_filter and effective_filter.allow_names else []
            base_deny = list(effective_filter.deny_names) if effective_filter and effective_filter.deny_names else []
            agent_deny = list(agent_capability_filter.deny_names or []) if agent_capability_filter.deny_names else []

            if agent_capability_filter.allow_names is not None:
                merged_allow = list(agent_capability_filter.allow_names)
            else:
                merged_allow = base_allow or None
            merged_deny = list(dict.fromkeys(base_deny + agent_deny)) or None
            effective_filter = CapabilityFilter(allow_names=merged_allow, deny_names=merged_deny)

        # 调度层过滤：主模型只看到调度相关工具（用于多智能体协作场景）
        # 只有当用户没有选择特定智能体时，才应用调度限制
        if agent_cfg is None:
            # 无指定智能体：主模型默认只能使用调度层工具
            if effective_filter:
                dispatch_deny = []
                for name in (effective_filter.allow_names or []):
                    if name not in DISPATCH_TOOL_NAMES and not name.startswith(REMOTE_AGENT_TOOL_PREFIX):
                        dispatch_deny.append(name)
                if dispatch_deny:
                    existing_deny = list(effective_filter.deny_names) if effective_filter.deny_names else []
                    effective_filter = CapabilityFilter(
                        allow_names=list(DISPATCH_TOOL_NAMES),
                        deny_names=list(dict.fromkeys(existing_deny + dispatch_deny)) or None,
                    )

        scheduler_cfg = load_scheduler_config()
        if agent_cfg:
            requested_mode = "direct"
        else:
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
                    "description": f"调度模式: {schedule.mode} | 循环模式: {agent_loop_mode}",
                    "schedulerMode": schedule.mode,
                    "executionPlan": execution_plan.to_event_payload(),
                    "loopMode": agent_loop_mode,
                }
            ),
        }
        run_input = LoopRunInput(
            user_message=user_content,
            history=history,
            capabilities=selected_caps,
            extra_system=extra_system,
            limits=limits,
            model=llm_model,
            loop_mode=agent_loop_mode,
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

