from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, List

from app.models.message import Attachment


class GatewayTurnRequest(BaseModel):
    """
    网关消息请求

    多渠道接入的统一入口请求格式。
    """

    channel_id: str = Field(..., description="渠道ID（如 feishu/web/openai）")
    external_thread_id: Optional[str] = Field(default=None, description="外部系统会话ID")
    session_id: Optional[str] = Field(default=None, description="MeowOne 会话ID（与 external_thread_id 二选一）")
    content: str = Field(default="", description="消息内容")
    attachments: Optional[List[Attachment]] = Field(default=None, description="附件列表")
    max_rounds: Optional[int] = Field(default=None, description="最大对话轮次")
    max_tool_phases: Optional[int] = Field(default=None, description="最大工具调用阶段数")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间（秒）")
    scheduler_mode: Optional[str] = Field(default=None, description="调度模式")
    task_tag: Optional[str] = Field(default=None, description="任务标签")

