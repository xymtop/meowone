"""
对话轮次服务（新版）

将所有请求统一接入 dispatch 调度层：
1. 加载历史消息
2. 调用 dispatch() 生成事件流
3. 将 LoopEvent 转换为 SSE 格式

注意：这是 gateway 层唯一的 ConversationTurnService。
"""
from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator, Dict, List, Optional

import uuid

logger = logging.getLogger(__name__)

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
from app.loop.input import LoopLimits
from app.dispatch.gateway import dispatch
from app.services import message_service


class ConversationTurnService:
    """对话轮次服务：封装 dispatch 层，为 SSE 网关提供事件流"""

    async def stream_turn(
        self,
        session_id: str,
        user_content: UserContent,
        exclude_for_history: str,
        *,
        channel_id: str = "web",
        scheduler_mode: Optional[str] = None,
        task_tag: Optional[str] = None,
        capability_filter: Optional[Any] = None,
        limits: Optional[LoopLimits] = None,
        agent_name: Optional[str] = None,
        agent_type: Optional[str] = None,
        agent_id: Optional[str] = None,
        instance_id: Optional[str] = None,
        model_name: Optional[str] = None,
    ) -> AsyncIterator[Dict[str, str]]:
        """
        对话轮次入口

        Args:
            session_id: 会话 ID
            user_content: 用户消息
            exclude_for_history: 不存入历史的排除内容
            channel_id: 渠道 ID
            scheduler_mode: 调度模式（direct / team_dispatch / capability_match）
            task_tag: 任务标签
            capability_filter: 能力过滤器（已废弃，保留兼容性）
            limits: 资源限制
            agent_name: 智能体名称
            agent_type: 智能体类型
            agent_id: 智能体 ID
            instance_id: 实例 ID
            model_name: 模型名称

        Yields:
            SSE 事件字典 {"event": "xxx", "data": "..."}
        """
        from app.db.queries.sessions import get_history_as_openai_messages

        # 1. 加载历史
        history = await get_history_as_openai_messages(session_id, limit=50)
        if history and history[-1].get("content") == exclude_for_history:
            history = history[:-1]

        # 2. 提取文本内容
        text_content = self._extract_text_content(user_content)

        # 3. 发送初始 thinking 事件
        yield {
            "event": "thinking",
            "data": json.dumps({
                "step": 0,
                "description": f"调度中...",
            }),
        }

        # 4. 调用 dispatch 层（统一入口）
        logger.info("stream_turn: 开始调用 dispatch, agent_id=%s, instance_id=%s, agent_name=%s", agent_id, instance_id, agent_name)
        
        # 用于累积 assistant 消息内容
        assistant_parts: List[str] = []
        assistant_message_id: Optional[str] = None
        
        async for event in dispatch(
            user_message=text_content,
            history=history,
            session_id=session_id,
            agent_id=agent_id,
            instance_id=instance_id,
            agent_name=agent_name,
            model=model_name,
        ):
            logger.info("stream_turn 收到 event: type=%s", type(event).__name__)
            
            # 累积文本内容，记录 message_id
            if isinstance(event, DeltaEvent):
                if event.content and assistant_message_id is None:
                    assistant_message_id = getattr(event, "message_id", None)
                if event.content:
                    assistant_parts.append(event.content)
            
            payload = self._event_to_sse(event, session_id)
            if payload:
                logger.info("stream_turn 发送 SSE: event=%s", payload.get("event"))
                yield payload
            else:
                logger.warning("stream_turn 跳过 event: type=%s (payload=None)", type(event).__name__)
            
            # DoneEvent 时保存 assistant 消息到数据库
            if isinstance(event, DoneEvent):
                full_content = "".join(assistant_parts).strip()
                if full_content:
                    logger.info("stream_turn: 保存 assistant 消息到数据库, len=%d", len(full_content))
                    await message_service.create_message(
                        session_id=session_id,
                        role="assistant",
                        content_type="text",
                        content=full_content,
                    )
                else:
                    logger.warning("stream_turn: assistant 内容为空，跳过保存")
        
        logger.info("stream_turn: dispatch 完成")

    def _extract_text_content(self, user_content: UserContent) -> str:
        """从用户内容中提取纯文本"""
        if isinstance(user_content, str):
            return user_content
        if isinstance(user_content, list):
            parts = []
            for item in user_content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        parts.append(str(item.get("text") or ""))
            return "\n".join(parts)
        return str(user_content or "")

    def _event_to_sse(
        self,
        event: LoopEvent,
        session_id: str,
    ) -> Optional[Dict[str, str]]:
        """将 LoopEvent 转换为 SSE 格式"""
        if isinstance(event, ThinkingEvent):
            return {
                "event": "thinking",
                "data": json.dumps({"step": event.step, "description": event.description}),
            }
        if isinstance(event, DeltaEvent):
            return {
                "event": "delta",
                "data": json.dumps({
                    "messageId": getattr(event, "message_id", ""),
                    "content": event.content,
                    "done": event.done,
                }),
            }
        if isinstance(event, CardEvent):
            return {
                "event": "card",
                "data": json.dumps({
                    "messageId": getattr(event, "message_id", ""),
                    "card": event.card,
                }),
            }
        if isinstance(event, ToolCallEvent):
            return {
                "event": "tool_call",
                "data": json.dumps({
                    "toolCallId": event.tool_call_id,
                    "name": event.capability_name,
                }),
            }
        if isinstance(event, ToolResultEvent):
            return {
                "event": "tool_result",
                "data": json.dumps({
                    "toolCallId": event.tool_call_id,
                    "name": event.capability_name,
                    "ok": event.success,
                }),
            }
        if isinstance(event, ErrorEvent):
            return {
                "event": "error",
                "data": json.dumps({"code": event.code, "message": event.message}),
            }
        if isinstance(event, DoneEvent):
            return {
                "event": "done",
                "data": json.dumps({
                    "messageId": event.message_id,
                    "loopRounds": event.loop_rounds,
                    "totalDuration": event.total_duration,
                }),
            }
        return None
