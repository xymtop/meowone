"""
消息数据模型模块

定义消息相关的请求/响应数据结构，包括：
- Attachment: 二进制附件
- ChatRequest: 聊天请求
- CardActionRequest: 卡片动作请求
- A2UIActionRequest: A2UI 动作请求
- MessageResponse: 消息响应
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List


class Attachment(BaseModel):
    """二进制附件（base64 编码）

    用于传输图片或其他多模态数据，支持任意二进制数据。
    """

    name: str = Field(default="", description="文件名")
    mime: str = Field(default="application/octet-stream", description="MIME类型")
    data: str = Field(default="", description="base64编码的二进制数据")


class ChatRequest(BaseModel):
    """聊天请求

    用户向会话发送消息时使用的请求格式，支持文本和多模态输入。
    """

    content: str = Field(default="", description="消息内容")
    type: str = Field(default="text", description="消息类型（text/markdown等）")
    attachments: Optional[List[Attachment]] = Field(default=None, description="附件列表")
    channel_id: Optional[str] = Field(default=None, description="渠道ID")
    max_rounds: Optional[int] = Field(default=None, description="最大对话轮次")
    max_tool_phases: Optional[int] = Field(default=None, description="最大工具调用阶段数")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间（秒）")
    scheduler_mode: Optional[str] = Field(default=None, description="调度模式（direct/hierarchical等）")
    task_tag: Optional[str] = Field(default=None, description="任务标签")
    agent_name: Optional[str] = Field(default=None, description="指定智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型（internal/external）")
    agent_id: Optional[str] = Field(default=None, description="指定智能体ID（优先于name）")
    instance_id: Optional[str] = Field(default=None, description="指定实例ID（与agent_id互斥，传instance_id时走实例调度路径）")
    model_name: Optional[str] = Field(default=None, description="指定模型名称")


class CardActionRequest(BaseModel):
    """卡片动作请求

    用于处理用户与卡片交互后的回调。
    """

    cardId: str = Field(..., description="卡片ID")
    actionId: str = Field(..., description="动作ID")
    payload: Dict[str, Any] = Field(default_factory=dict, description="动作载荷数据")
    channel_id: Optional[str] = Field(default=None, description="渠道ID")
    max_rounds: Optional[int] = Field(default=None, description="最大对话轮次")
    max_tool_phases: Optional[int] = Field(default=None, description="最大工具调用阶段数")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间（秒）")
    scheduler_mode: Optional[str] = Field(default=None, description="调度模式")
    task_tag: Optional[str] = Field(default=None, description="任务标签")
    agent_name: Optional[str] = Field(default=None, description="指定智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型")
    agent_id: Optional[str] = Field(default=None, description="指定智能体ID")
    instance_id: Optional[str] = Field(default=None, description="指定实例ID")
    model_name: Optional[str] = Field(default=None, description="指定模型名称")


class A2UIActionRequest(BaseModel):
    """A2UI 动作请求

    客户端 @a2ui-sdk/react 派发的 ActionPayload（surfaceId / name / context 等）。
    """

    action: Dict[str, Any] = Field(..., description="动作数据（包含 surfaceId、name、context 等）")
    channel_id: Optional[str] = Field(default=None, description="渠道ID")
    max_rounds: Optional[int] = Field(default=None, description="最大对话轮次")
    max_tool_phases: Optional[int] = Field(default=None, description="最大工具调用阶段数")
    timeout_seconds: Optional[int] = Field(default=None, description="超时时间（秒）")
    scheduler_mode: Optional[str] = Field(default=None, description="调度模式")
    task_tag: Optional[str] = Field(default=None, description="任务标签")
    agent_name: Optional[str] = Field(default=None, description="指定智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型")
    agent_id: Optional[str] = Field(default=None, description="指定智能体ID")
    instance_id: Optional[str] = Field(default=None, description="指定实例ID")
    model_name: Optional[str] = Field(default=None, description="指定模型名称")


class MessageResponse(BaseModel):
    """消息响应

    包含会话中消息的完整信息。
    """

    id: str = Field(..., description="消息ID")
    session_id: str = Field(..., description="会话ID")
    role: str = Field(..., description="角色（user/assistant/tool/system）")
    content_type: str = Field(..., description="内容类型（text/card/cards等）")
    content: Optional[str] = Field(default=None, description="消息文本内容")
    card_data: Optional[Any] = Field(default=None, description="卡片数据（当 content_type 为 card 时）")
    created_at: str = Field(..., description="创建时间（ISO8601格式）")
