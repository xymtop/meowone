"""
AgentRuntime —— 智能体运行时数据类

由 builder.py 从数据库配置动态构建，包含执行一个智能体所需的全部信息。
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class AgentLimits:
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None


@dataclass
class AgentRuntime:
    """
    智能体运行时配置

    Attributes:
        id:             数据库中的智能体 ID
        name:           智能体名称
        agent_type:     "internal" 或 "external"
        description:    描述
        system_prompt:  组装好的完整系统提示词（包含 prompt模板 + skills + overlay）
        mcp_servers:    允许的 MCP 服务器名称列表
        skills:         绑定的 skill 名称列表
        loop_mode:      loop 算法名称（"react" / "plan_exec"）
        limits:         资源限制
        allow_tools:    工具白名单（空 = 不限制）
        deny_tools:     工具黑名单
        capabilities:   已过滤的能力注册表（仅内部智能体有效）
        # 外部智能体专用
        base_url:       A2A 端点地址
        auth_token:     认证 token（可选）
        metadata:       其他元数据
    """
    id: str
    name: str
    agent_type: str  # "internal" | "external"
    description: str = ""
    system_prompt: str = ""
    mcp_servers: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    loop_mode: str = "react"
    limits: AgentLimits = field(default_factory=AgentLimits)
    allow_tools: List[str] = field(default_factory=list)
    deny_tools: List[str] = field(default_factory=list)
    capabilities: Any = None  # CapabilityRegistry，由 builder 设置
    # 外部智能体
    base_url: str = ""
    auth_token: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
