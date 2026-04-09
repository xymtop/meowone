from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class OpenAIChatCompletionsRequest(BaseModel):
    """
    OpenAI Chat Completions 请求格式

    兼容 OpenAI API 的请求格式。
    """

    model: Optional[str] = Field(default=None, description="模型名称（如 gpt-4, gpt-3.5-turbo）")
    messages: List[Dict[str, Any]] = Field(..., description="消息列表，格式为 [{\"role\": \"user\", \"content\": \"...\"}]")
    stream: bool = Field(default=True, description="是否流式返回")
    user: Optional[str] = Field(default=None, description="用户标识")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="元数据（可包含 conversation_id 或 thread_id）")
    max_rounds: Optional[int] = Field(default=None, description="最大对话轮次")
    max_tool_phases: Optional[int] = Field(default=None, description="最大工具调用阶段数")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间（秒）")
    scheduler_mode: Optional[str] = Field(default=None, description="调度模式（direct/hierarchical等）")
    task_tag: Optional[str] = Field(default=None, description="任务标签")


def last_user_content(messages: List[Dict[str, Any]]) -> Union[str, List[Dict[str, Any]]]:
    """
    从消息列表中获取最后一条用户消息的内容
    """
    for m in reversed(messages):
        if m.get("role") == "user":
            return m.get("content") or ""
    return ""

