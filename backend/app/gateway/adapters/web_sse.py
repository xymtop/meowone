from __future__ import annotations

from typing import AsyncIterator, Dict

from app.loop.context import UserContent
from app.gateway.turn_service import ConversationTurnService
from app.loop.input import LoopLimits


async def stream_web_sse_turn(
    service: ConversationTurnService,
    *,
    session_id: str,
    user_content: UserContent,
    exclude_for_history: str,
    channel_id: str = "web",
    limits: LoopLimits | None = None,
) -> AsyncIterator[Dict[str, str]]:
    async for item in service.stream_turn(
        session_id=session_id,
        user_content=user_content,
        exclude_for_history=exclude_for_history,
        channel_id=channel_id,
        limits=limits,
    ):
        yield item

