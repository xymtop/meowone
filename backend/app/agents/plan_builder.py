"""
智能体计划构建器模块

根据智能体定义构建完整的运行时计划（AgentRuntimePlan）。

主要功能：
- build: 从 AgentDefinition 构建 AgentRuntimePlan
- _resolve_skill_bodies: 解析技能正文
- _apply_mcp_whitelist: 应用 MCP 服务白名单
- _resolve_limits: 解析资源限制
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

from app.agents.definition import AgentDefinition
from app.capability.registry import CapabilityRegistry, registry
from app.capability.runtime import CapabilityFilter, CapabilityRuntime
from app.loop.input import LoopLimits
from app.services import prompt_service, skill_service


@dataclass
class AgentRuntimePlan:
    """智能体运行时计划

    包含执行智能体所需的所有信息：
    - 智能体标识
    - 解析后的系统提示词
    - 解析后的能力（工具）
    - 解析后的资源限制
    - 执行传输类型
    - 循环模式
    """
    agent_name: str
    agent_type: str
    resolved_system_prompt: str
    resolved_capabilities: CapabilityRegistry
    resolved_limits: LoopLimits
    execution_transport: str
    loop_mode: str = "react"


class RestrictedCallMcpTool:
    """受限的 MCP 工具调用能力

    将 call_mcp_tool 包装为受限版本，只允许调用指定的 MCP 服务器。
    用于实现智能体的 MCP 服务白名单功能。

    Attributes:
        name: 工具名称（固定为 call_mcp_tool）
        display_name: 显示名称
        description: 描述
        permission: 权限级别
        category: 分类
        tags: 标签
        parameters_schema: 参数 schema
    """

    name = "call_mcp_tool"
    display_name = "Call MCP tool (restricted)"
    description = "Invoke only MCP servers explicitly bound to this agent."
    permission = "sensitive"
    category = "mcp"
    tags = ("mcp", "restricted")
    parameters_schema = {
        "type": "object",
        "properties": {
            "server": {"type": "string", "enum": []},
            "tool": {"type": "string"},
            "arguments": {"type": "object"},
        },
        "required": ["server", "tool"],
    }

    def __init__(self, base_capability: Any, allowed_servers: List[str]) -> None:
        """初始化受限 MCP 工具

        Args:
            base_capability: 基础 MCP 调用能力
            allowed_servers: 允许的服务器名称列表
        """
        self._base = base_capability
        self._allowed = {x for x in allowed_servers if x}
        # 动态构建参数 schema，限制 server 枚举值
        self.parameters_schema = {
            "type": "object",
            "properties": {
                "server": {"type": "string", "enum": sorted(self._allowed)},
                "tool": {"type": "string"},
                "arguments": {"type": "object"},
            },
            "required": ["server", "tool"],
        }

    async def execute(self, params: Dict[str, Any]) -> str:
        """执行 MCP 调用

        检查服务器是否在白名单中，如果不在则拒绝执行。

        Args:
            params: 参数，包含 server、tool、arguments

        Returns:
            执行结果字符串
        """
        server = str(params.get("server") or "").strip()
        if server not in self._allowed:
            return f"Error: MCP server `{server}` is not allowed for this agent"
        return await self._base.execute(params)

    def to_openai_tool(self) -> Dict[str, Any]:
        """转换为 OpenAI 工具格式

        Returns:
            OpenAI 函数调用格式的工具定义
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


class AgentPlanBuilder:
    """智能体计划构建器

    根据智能体定义构建运行时计划，包括：
    - 解析提示词模板
    - 解析技能正文
    - 应用工具策略
    - 应用 MCP 白名单
    - 解析资源限制
    """

    def __init__(self) -> None:
        """初始化计划构建器

        创建能力运行时实例，引用全局注册表
        """
        self._runtime = CapabilityRuntime(registry)

    async def build(
        self,
        definition: AgentDefinition,
        *,
        overrides: Dict[str, Any] | None = None,
        channel_id: str = "agent_execution",
    ) -> AgentRuntimePlan:
        """构建智能体运行时计划

        Args:
            definition: 智能体定义
            overrides: 可选的参数覆盖（如请求级别的 max_rounds）
            channel_id: 渠道 ID（用于能力过滤）

        Returns:
            完整的运行时计划

        Raises:
            ValueError: 智能体定义验证失败
        """
        # 验证智能体定义的合法性
        definition.validate()
        
        text_parts: List[str] = [f"## Agent\n- name: `{definition.name}`"]
        if definition.description:
            text_parts.append(f"- description: {definition.description}")

        # 解析提示词模板
        if definition.resources.prompt_key:
            prompt = await prompt_service.get_prompt(definition.resources.prompt_key)
            if prompt and str(prompt.get("content_md") or "").strip():
                text_parts.append("### Prompt template")
                text_parts.append(str(prompt.get("content_md") or "").strip())

        # 解析技能正文
        skill_bodies = await self._resolve_skill_bodies(definition.resources.skill_names)
        if skill_bodies:
            text_parts.append("### Skills")
            text_parts.extend(skill_bodies)

        # 添加系统提示词覆盖
        if definition.resources.system_prompt_overlay:
            text_parts.append("### Agent overlay")
            text_parts.append(definition.resources.system_prompt_overlay)

        # 构建能力过滤器
        cap_filter = CapabilityFilter(
            allow_names=definition.tool_policy.allow_tools or None,
            deny_names=definition.tool_policy.deny_tools or None,
        )
        
        # 解析能力
        selected = self._runtime.resolve(filter=cap_filter, channel_id=channel_id)
        
        # 应用 MCP 白名单
        constrained = self._apply_mcp_whitelist(selected, definition.resources.mcp_servers)

        # 解析资源限制
        merged_limits = self._resolve_limits(definition=definition, overrides=overrides or {})
        
        # 确定执行传输类型
        transport = "external_a2a" if definition.agent_type == "external" else "internal_loop"
        
        # 获取循环模式
        from app.loop.runtime import DEFAULT_LOOP_MODE
        loop_mode = definition.loop_mode or DEFAULT_LOOP_MODE
        
        return AgentRuntimePlan(
            agent_name=definition.name,
            agent_type=definition.agent_type,
            resolved_system_prompt="\n".join(text_parts).strip(),
            resolved_capabilities=constrained,
            resolved_limits=merged_limits,
            execution_transport=transport,
            loop_mode=loop_mode,
        )

    async def _resolve_skill_bodies(self, skill_names: List[str]) -> List[str]:
        """解析技能正文

        从数据库获取技能内容，构建技能正文列表。

        Args:
            skill_names: 技能名称列表

        Returns:
            技能正文列表，每项格式为 "#### {技能名}\n{正文}"
        """
        if not skill_names:
            return []
        
        skills = await skill_service.list_skills(enabled_only=True)
        by_name = {str(s.get("name") or ""): s for s in skills}
        
        out: List[str] = []
        for name in skill_names:
            row = by_name.get(name)
            if not row:
                continue
            body = str(row.get("body") or "").strip()
            if body:
                out.append(f"#### {name}\n{body}")
        return out

    def _apply_mcp_whitelist(self, selected: CapabilityRegistry, mcp_servers: List[str]) -> CapabilityRegistry:
        """应用 MCP 服务白名单

        将 call_mcp_tool 替换为受限版本，只允许调用指定的 MCP 服务器。

        Args:
            selected: 已选择的能力
            mcp_servers: 允许的 MCP 服务器列表

        Returns:
            应用白名单后的能力注册表
        """
        out = CapabilityRegistry()
        allow_servers = [x for x in mcp_servers if x]
        
        for cap in selected.list_all():
            if cap.name != "call_mcp_tool":
                # 非 MCP 调用工具直接保留
                out.register(cap)
                continue
            
            # 如果没有配置白名单，则不包含 call_mcp_tool
            if not allow_servers:
                continue
            
            # 注册受限版本的 MCP 调用工具
            out.register(RestrictedCallMcpTool(cap, allow_servers))
        return out

    @staticmethod
    def _resolve_limits(*, definition: AgentDefinition, overrides: Dict[str, Any]) -> LoopLimits:
        """解析资源限制

        将智能体定义中的限制与请求级别的覆盖合并。

        Args:
            definition: 智能体定义
            overrides: 请求级别的覆盖参数

        Returns:
            合并后的资源限制
        """
        d = definition.limits

        def _clamp(v: Any, default: int | None) -> int | None:
            """限制值，确保在有效范围内"""
            if v is None:
                return default
            try:
                iv = int(v)
            except Exception:
                return default
            # 无效值或负值使用默认值
            if iv <= 0:
                return default
            # 有默认值时取较小值
            if default is None:
                return iv
            return min(iv, default)

        return LoopLimits(
            max_rounds=_clamp(overrides.get("max_rounds"), d.max_rounds),
            max_tool_phases=_clamp(overrides.get("max_tool_phases"), d.max_tool_phases),
            timeout_seconds=_clamp(overrides.get("timeout_seconds"), d.timeout_seconds),
        )