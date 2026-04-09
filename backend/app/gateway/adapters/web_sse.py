from __future__ import annotations

from typing import Any, AsyncIterator, Dict

from app.loop.context import UserContent
from app.gateway.turn_service import ConversationTurnService
from app.loop.input import LoopLimits
from app.services import log_stream_service


async def stream_web_sse_turn(
    service: ConversationTurnService,
    *,
    session_id: str,
    user_content: UserContent,
    exclude_for_history: str,
    channel_id: str = "web",
    scheduler_mode: str | None = None,
    task_tag: str | None = None,
    limits: LoopLimits | None = None,
    agent_name: str | None = None,
    agent_type: str | None = None,
    agent_id: str | None = None,
    model_name: str | None = None,
    instance_id: str | None = None,
    instance_config: Dict[str, Any] | None = None,
) -> AsyncIterator[Dict[str, str]]:
    async for item in service.stream_turn(
        session_id=session_id,
        user_content=user_content,
        exclude_for_history=exclude_for_history,
        channel_id=channel_id,
        scheduler_mode=scheduler_mode,
        task_tag=task_tag,
        limits=limits,
        agent_name=agent_name,
        agent_type=agent_type,
        agent_id=agent_id,
        model_name=model_name,
        instance_id=instance_id,
        instance_config=instance_config,
    ):
        log_stream_service.append_log(
            session_id=session_id,
            event=item.get("event", "unknown"),
            data=item.get("data", ""),
        )
        yield item
