"""
智能体定义模块

定义智能体（Agent）的核心数据结构：
- AgentToolPolicy: 工具策略（允许/禁止的工具列表）
- AgentLimits: 智能体限制（最大轮次、超时等）
- AgentEndpoint: 智能体端点（协议、地址等）
- AgentResources: 智能体资源（提示词、MCP服务、Skills等）
- AgentDefinition: 智能体完整定义

支持两种类型的智能体：
- internal（内部智能体）：使用 internal_loop 协议，在平台内部执行
- external（外部智能体）：使用 a2a 协议，通过 HTTP 调用外部服务
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List


# 支持的通信协议列表
SUPPORTED_PROTOCOLS = {"internal_loop", "a2a"}


@dataclass
class AgentToolPolicy:
    """工具策略

    控制智能体可以或不可以使用哪些工具。
    
    Attributes:
        allow_tools: 允许的工具名称列表（空列表表示不限制）
        deny_tools: 禁止的工具名称列表（优先级高于 allow_tools）
    """
    allow_tools: List[str] = field(default_factory=list)
    deny_tools: List[str] = field(default_factory=list)


@dataclass
class AgentLimits:
    """智能体限制

    控制智能体执行时的资源限制。
    
    Attributes:
        max_rounds: 最大对话轮次数（None 表示使用系统默认值）
        max_tool_phases: 最大工具调用阶段数（None 表示使用系统默认值）
        timeout_seconds: 单次执行超时时间（秒，None 表示使用系统默认值）
    """
    max_rounds: int | None = None
    max_tool_phases: int | None = None
    timeout_seconds: int | None = None


@dataclass
class AgentEndpoint:
    """智能体端点

    定义智能体的通信协议和地址信息。
    
    Attributes:
        protocol: 通信协议（internal_loop 或 a2a）
        base_url: 基础 URL（external 智能体必需）
        metadata_json: 元数据 JSON（可包含认证信息等）
    """
    protocol: str
    base_url: str = ""
    metadata_json: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResources:
    """智能体资源

    定义智能体可使用的资源。
    
    Attributes:
        prompt_key: 提示词模板的键名（用于从数据库加载）
        system_prompt_overlay: 系统提示词覆盖（直接指定，优先级高于 prompt_key）
        mcp_servers: 绑定的 MCP 服务器名称列表
        skill_names: 绑定的 Agent Skill 名称列表
    """
    prompt_key: str = ""
    system_prompt_overlay: str = ""
    mcp_servers: List[str] = field(default_factory=list)
    skill_names: List[str] = field(default_factory=list)


@dataclass
class AgentDefinition:
    """智能体完整定义

    包含智能体的所有配置信息。
    
    Attributes:
        name: 智能体名称（唯一标识）
        agent_type: 智能体类型（internal 或 external）
        description: 智能体描述
        enabled: 是否启用
        resources: 智能体资源
        tool_policy: 工具策略
        limits: 智能体限制
        endpoint: 智能体端点
        loop_mode: 循环执行模式（react/plan_exec/critic/hierarchical）
    """
    name: str
    agent_type: str
    description: str = ""
    enabled: bool = True
    resources: AgentResources = field(default_factory=AgentResources)
    tool_policy: AgentToolPolicy = field(default_factory=AgentToolPolicy)
    limits: AgentLimits = field(default_factory=AgentLimits)
    endpoint: AgentEndpoint = field(default_factory=lambda: AgentEndpoint(protocol="internal_loop"))
    loop_mode: str = "react"

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "AgentDefinition":
        """从数据库行数据创建智能体定义

        Args:
            row: 数据库行数据（字典格式）

        Returns:
            AgentDefinition 实例
        """
        # 确定协议类型
        agent_type = str(row.get("agent_type") or "internal")
        protocol = str(row.get("protocol") or "").strip()
        if not protocol:
            # 未指定协议时，根据类型推断
            protocol = "a2a" if agent_type == "external" else "internal_loop"
        
        # 解析元数据 JSON
        metadata = row.get("metadata_json") or {}
        if isinstance(metadata, str) and metadata:
            metadata = json.loads(metadata)
        
        return cls(
            name=str(row.get("name") or "").strip(),
            agent_type=agent_type,
            description=str(row.get("description") or "").strip(),
            enabled=bool(row.get("enabled", 1)),
            resources=AgentResources(
                prompt_key=str(row.get("prompt_key") or "").strip(),
                system_prompt_overlay=str(row.get("system_prompt") or "").strip(),
                # 解析 JSON 列表字段
                mcp_servers=[str(x) for x in (row.get("mcp_servers") or []) if str(x).strip()],
                skill_names=[str(x) for x in (row.get("agent_skills") or []) if str(x).strip()],
            ),
            tool_policy=AgentToolPolicy(
                allow_tools=[str(x) for x in (row.get("allow_tools") or []) if str(x).strip()],
                deny_tools=[str(x) for x in (row.get("deny_tools") or []) if str(x).strip()],
            ),
            limits=AgentLimits(
                max_rounds=row.get("max_rounds"),
                max_tool_phases=row.get("max_tool_phases"),
                timeout_seconds=row.get("timeout_seconds"),
            ),
            endpoint=AgentEndpoint(
                protocol=protocol,
                base_url=str(row.get("base_url") or "").strip(),
                metadata_json=metadata,
            ),
            # 从元数据中获取循环模式，默认为 react
            loop_mode=str(metadata.get("loop_mode") or "react").strip() or "react",
        )

    def validate(self) -> None:
        """验证智能体定义的合法性

        检查项：
        - name 不能为空
        - agent_type 必须是 internal 或 external
        - protocol 必须是支持的协议
        - internal 智能体必须使用 internal_loop 协议
        - external 智能体必须使用 a2a 协议且需要 base_url

        Raises:
            ValueError: 验证失败时抛出
        """
        if not self.name:
            raise ValueError("agent name is required")
        if self.agent_type not in {"internal", "external"}:
            raise ValueError("agent_type must be internal or external")
        if self.endpoint.protocol not in SUPPORTED_PROTOCOLS:
            raise ValueError(f"unsupported protocol: {self.endpoint.protocol}")
        if self.agent_type == "internal" and self.endpoint.protocol != "internal_loop":
            raise ValueError("internal agent must use protocol internal_loop")
        if self.agent_type == "external":
            if self.endpoint.protocol != "a2a":
                raise ValueError("external agent must use protocol a2a")
            if not self.endpoint.base_url:
                raise ValueError("external a2a agent base_url is required")
        # 验证循环模式
        from app.loop.runtime import SUPPORTED_LOOP_MODES
        if self.loop_mode not in SUPPORTED_LOOP_MODES:
            raise ValueError(f"loop_mode must be one of: {', '.join(sorted(SUPPORTED_LOOP_MODES))}")
