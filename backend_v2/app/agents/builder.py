"""
AgentBuilder —— 从数据库动态构建 AgentRuntime

从 agents 表及关联的 prompts、skills、mcp_servers 表读取配置，
组装出完整的 AgentRuntime 对象，供 caller.py 使用。
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.agents.runtime import AgentRuntime, AgentLimits
from app.db.queries.agents import get_agent_by_id, get_agent_by_name
from app.db.queries.prompts import get_prompt_by_key
from app.db.queries.skills import list_skills
from app.capability.registry import CapabilityRegistry, registry as global_registry
from app.capability.runtime import CapabilityFilter, CapabilityRuntime

logger = logging.getLogger(__name__)


class AgentBuilder:
    """从数据库配置动态构建 AgentRuntime"""

    def __init__(self) -> None:
        self._cap_runtime = CapabilityRuntime(global_registry)

    async def build_by_id(self, agent_id: str) -> Optional[AgentRuntime]:
        logger.info("AgentBuilder.build_by_id: agent_id=%s", agent_id)
        row = await get_agent_by_id(agent_id)
        if not row:
            logger.warning("build_by_id: 找不到智能体 id=%s", agent_id)
            return None
        logger.info("build_by_id: 找到 row, name=%s, type=%s", row.get("name"), row.get("agent_type"))
        return await self._build_from_row(row)

    async def build_by_name(self, name: str) -> Optional[AgentRuntime]:
        logger.info("AgentBuilder.build_by_name: name=%s", name)
        row = await get_agent_by_name(name)
        if not row:
            logger.warning("build_by_name: 找不到智能体 name=%s", name)
            return None
        logger.info("build_by_name: 找到 row, id=%s, type=%s", row.get("id"), row.get("agent_type"))
        return await self._build_from_row(row)

    async def _build_from_row(self, row: Dict[str, Any]) -> AgentRuntime:
        agent_id = str(row.get("id") or "")
        name = str(row.get("name") or "")
        agent_type = str(row.get("agent_type") or "internal")
        description = str(row.get("description") or "")
        enabled = bool(row.get("enabled", 1))

        if not enabled:
            logger.warning("智能体 %s 已禁用", name)

        logger.info("_build_from_row: agent_id=%s, name=%s, type=%s, enabled=%s", agent_id, name, agent_type, enabled)

        # --- 元数据 ---
        metadata = row.get("metadata_json") or {}
        loop_mode = str(metadata.get("loop_mode") or row.get("loop_id") or "react")
        if loop_mode not in ("react", "plan_exec"):
            loop_mode = "react"

        # --- 系统提示词组装 ---
        system_prompt = await self._build_system_prompt(row)
        logger.info("_build_from_row: system_prompt 长度=%d, 前100字=%.100s", len(system_prompt), system_prompt[:100])

        # --- 资源限制 ---
        limits = AgentLimits(
            max_rounds=row.get("max_rounds"),
            max_tool_phases=row.get("max_tool_phases"),
            timeout_seconds=row.get("timeout_seconds"),
        )

        # --- 工具策略 ---
        allow_tools = [str(x) for x in (row.get("allow_tools") or []) if str(x).strip()]
        deny_tools = [str(x) for x in (row.get("deny_tools") or []) if str(x).strip()]
        mcp_servers = [str(x) for x in (row.get("mcp_servers") or []) if str(x).strip()]
        skills = [str(x) for x in (row.get("agent_skills") or []) if str(x).strip()]
        logger.info("_build_from_row: allow_tools=%s, deny_tools=%s, mcp_servers=%s, skills=%s",
                    allow_tools, deny_tools, mcp_servers, skills)

        # --- 能力注册表（内部智能体）---
        capabilities: Optional[CapabilityRegistry] = None
        if agent_type == "internal":
            capabilities = self._resolve_capabilities(
                allow_tools=allow_tools,
                deny_tools=deny_tools,
                mcp_servers=mcp_servers,
            )
            logger.info("_build_from_row: capabilities 过滤后数量=%d", len(capabilities.list_all()) if capabilities else 0)

        # --- 外部智能体端点 ---
        protocol = str(row.get("protocol") or "")
        if not protocol:
            protocol = "a2a" if agent_type == "external" else "internal_loop"
        base_url = str(row.get("base_url") or "")
        auth_token = str(metadata.get("auth_token") or "")

        logger.info("_build_from_row: protocol=%s, base_url=%s", protocol, base_url)

        return AgentRuntime(
            id=agent_id,
            name=name,
            agent_type=agent_type,
            description=description,
            system_prompt=system_prompt,
            mcp_servers=mcp_servers,
            skills=skills,
            loop_mode=loop_mode,
            limits=limits,
            allow_tools=allow_tools,
            deny_tools=deny_tools,
            capabilities=capabilities,
            base_url=base_url,
            auth_token=auth_token,
            metadata=metadata,
        )

    async def _build_system_prompt(self, row: Dict[str, Any]) -> str:
        parts: List[str] = [f"## Agent\n- name: `{row.get('name', '')}`"]
        if row.get("description"):
            parts.append(f"- description: {row['description']}")

        # 1. prompt_key → 加载 prompt 模板（独立加载，不影响后续步骤）
        prompt_key = str(row.get("prompt_key") or "").strip()
        if prompt_key:
            prompt = await get_prompt_by_key(prompt_key)
            if prompt and str(prompt.get("content_md") or "").strip():
                parts.append("### Prompt template")
                parts.append(str(prompt["content_md"]).strip())

        # 2. skills → 加载 skill body（独立于 prompt_key）
        skill_names = [str(x) for x in (row.get("agent_skills") or []) if str(x).strip()]
        if skill_names:
            skill_bodies = await self._load_skill_bodies(skill_names)
            if skill_bodies:
                parts.append("### Skills")
                parts.extend(skill_bodies)

        # 3. system_prompt（直接覆盖）
        overlay = str(row.get("system_prompt") or "").strip()
        if overlay:
            parts.append("### Agent instructions")
            parts.append(overlay)

        return "\n\n".join(parts).strip()

    async def _load_skill_bodies(self, skill_names: List[str]) -> List[str]:
        all_skills = await list_skills(enabled_only=True)
        by_name = {str(s.get("name") or ""): s for s in all_skills}
        out: List[str] = []
        for name in skill_names:
            s = by_name.get(name)
            if not s:
                continue
            body = str(s.get("body") or "").strip()
            if body:
                out.append(f"#### {name}\n{body}")
        return out

    def _resolve_capabilities(
        self,
        allow_tools: List[str],
        deny_tools: List[str],
        mcp_servers: List[str],
    ) -> CapabilityRegistry:
        logger.info("_resolve_capabilities: allow=%s, deny=%s, mcp_servers=%s", allow_tools, deny_tools, mcp_servers)

        # 如果没有配置 allow_tools，默认不给任何内置工具
        if not allow_tools:
            logger.info("_resolve_capabilities: 未配置 allow_tools，返回空能力注册表")
            if not mcp_servers:
                return CapabilityRegistry()
            # 有 MCP 但没有 allow_tools，只保留 call_mcp_tool
            cap_filter = CapabilityFilter(
                allow_names=["call_mcp_tool"],
                deny_names=None,
            )
            selected = self._cap_runtime.resolve(filter=cap_filter)
            out = CapabilityRegistry()
            for cap in selected.list_all():
                if cap.name == "call_mcp_tool":
                    out.register(_RestrictedMcpTool(cap, mcp_servers))
            logger.info("_resolve_capabilities: 仅 MCP，白名单=%s, final count=%d", mcp_servers, len(out.list_all()))
            return out

        cap_filter = CapabilityFilter(
            allow_names=allow_tools,
            deny_names=deny_tools or None,
        )
        selected = self._cap_runtime.resolve(filter=cap_filter)
        logger.info("_resolve_capabilities: after tool filter, count=%d", len(selected.list_all()))

        # 应用 MCP 白名单
        if not mcp_servers:
            out = CapabilityRegistry()
            for cap in selected.list_all():
                if cap.name != "call_mcp_tool":
                    out.register(cap)
            logger.info("_resolve_capabilities: no MCP configured, removed call_mcp_tool, final count=%d", len(out.list_all()))
            return out

        # 有配置 MCP → 限制为白名单
        out = CapabilityRegistry()
        for cap in selected.list_all():
            if cap.name == "call_mcp_tool":
                out.register(_RestrictedMcpTool(cap, mcp_servers))
            else:
                out.register(cap)
        logger.info("_resolve_capabilities: MCP restricted to %s, final count=%d", mcp_servers, len(out.list_all()))
        return out


class _RestrictedMcpTool:
    """受限的 MCP 工具调用（只允许白名单内的 server）"""
    name = "call_mcp_tool"
    display_name = "Call MCP tool (restricted)"
    description = "Invoke only MCP servers explicitly bound to this agent."
    permission = "sensitive"
    category = "mcp"
    tags = ("mcp", "restricted")

    def __init__(self, base: Any, allowed: List[str]) -> None:
        self._base = base
        self._allowed = {x for x in allowed if x}
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
        server = str(params.get("server") or "").strip()
        if server not in self._allowed:
            return f"Error: MCP server `{server}` is not allowed for this agent"
        return await self._base.execute(params)

    def to_openai_tool(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


# 全局单例
agent_builder = AgentBuilder()
