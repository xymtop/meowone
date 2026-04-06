"""Expose MCP `tools/list` as a normal tool (stdio MCP servers from `.meowone/mcp.yaml`)."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.mcp.stdio_session import list_tools_for_command
from app.mcp.yaml_config import load_mcp_servers
from app.paths import repo_root


class ListMcpToolsTool(BaseTool):
    name = "list_mcp_tools"
    display_name = "List MCP tools"
    description = (
        "List tools exposed by configured MCP servers (stdio), from `.meowone/mcp.yaml`. "
        "Optional `server` filters to one server name."
    )
    permission = "standard"
    category = "mcp"
    tags = ("mcp",)

    parameters_schema = {
        "type": "object",
        "properties": {
            "server": {
                "type": "string",
                "description": "Optional MCP server name from mcp.yaml; omit to query all.",
            },
        },
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        filt = str(params.get("server") or "").strip()
        servers = load_mcp_servers()
        if not servers:
            return "No MCP servers configured (.meowone/mcp.yaml)."
        out: Dict[str, Any] = {}
        for s in servers:
            if filt and s.name != filt:
                continue
            cwd = None
            if s.cwd:
                p = Path(s.cwd)
                cwd = p if p.is_absolute() else repo_root() / p
            try:
                tl = await list_tools_for_command(s.command, cwd=cwd)
                out[s.name] = {"ok": True, "tools": tl}
            except Exception as e:
                out[s.name] = {"ok": False, "error": str(e)}
        if filt and not out:
            return f"No MCP server named `{filt}`."
        return json.dumps(out, ensure_ascii=False, indent=2)
