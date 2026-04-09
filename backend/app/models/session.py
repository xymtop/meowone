"""
会话数据模型模块

定义会话(Session)相关的数据结构：
- SessionCreate: 创建会话请求
- SessionUpdate: 更新会话请求
- SessionResponse: 会话响应
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional


class SessionCreate(BaseModel):
    """创建会话请求
    
    用户创建新会话时提交的参数
    """

    title: Optional[str] = Field(default=None, description="会话标题")
    agent_name: Optional[str] = Field(default=None, description="关联智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型")


class SessionUpdate(BaseModel):
    """更新会话请求
    
    用户更新会话信息时提交的参数
    """

    title: Optional[str] = Field(default=None, description="会话标题")
    agent_name: Optional[str] = Field(default=None, description="关联智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型")


class SessionResponse(BaseModel):
    """会话响应
    
    包含会话的完整信息
    """

    id: str = Field(..., description="会话ID（UUID格式）")
    user_id: str = Field(..., description="用户ID")
    title: Optional[str] = Field(default=None, description="会话标题")
    summary: Optional[str] = Field(default=None, description="会话摘要")
    agent_name: Optional[str] = Field(default=None, description="关联智能体名称")
    agent_type: Optional[str] = Field(default=None, description="智能体类型")
    created_at: str = Field(..., description="创建时间（ISO8601格式）")
    updated_at: str = Field(..., description="更新时间（ISO8601格式）")
