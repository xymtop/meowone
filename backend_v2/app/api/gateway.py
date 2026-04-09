"""网关日志 API —— /api/gateway/logs"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services import log_stream_service

router = APIRouter(prefix="/api/gateway", tags=["网关"])


class GatewayLogsResponse(BaseModel):
    items: list[dict]
    nextCursor: int


@router.get("/logs", response_model=GatewayLogsResponse)
async def get_gateway_logs(
    session_id: Optional[str] = Query(default=None, description="按会话ID过滤（可选）"),
    cursor: int = Query(default=0, ge=0, description="游标（已返回的最大日志ID）"),
    limit: int = Query(default=50, ge=1, le=200, description="每次返回的条数"),
):
    """
    查询网关 SSE 事件日志（cursor 增量拉取）。

    - `session_id` 不传则返回所有会话的日志
    - `cursor` 传上次返回的 `nextCursor`，可实现增量拉取
    - `limit` 最大 200
    """
    result = log_stream_service.query_logs(
        cursor=cursor,
        limit=limit,
        session_id=session_id,
    )
    return GatewayLogsResponse(
        items=result["items"],
        nextCursor=result["nextCursor"],
    )
