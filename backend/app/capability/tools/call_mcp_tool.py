"""Call an MCP tool via stdio (`tools/call`) — implements the common 'MCP as tools' pattern."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.mcp.stdio_session import call_tool
from app.mcp.yaml_config import get_server_by_name
from app.paths import repo_root


class CallMcpToolTool(BaseTool):
    name = "call_mcp_tool"
    display_name = "Call MCP tool"
    description = (
        "Invoke a tool on a configured MCP server (stdio). "
        "Use `list_mcp_tools` first to see tool names and schemas."
    )
    permission = "sensitive"
    category = "mcp"
    tags = ("mcp",)

    parameters_schema = {
        "type": "object",
        "properties": {
            "server": {
                "type": "string",
                "description": "MCP server name from .meowone/mcp.yaml",
            },
            "tool": {
                "type": "string",
                "description": "Tool name from the MCP server's tools/list",
            },
            "arguments": {
                "type": "object",
                "description": "Arguments object for the tool (JSON object).",
            },
        },
        "required": ["server", "tool"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        sname = str(params.get("server") or "").strip()
        tname = str(params.get("tool") or "").strip()
        args = params.get("arguments")
        if not isinstance(args, dict):
            args = {}
        if not sname or not tname:
            return "Error: `server` and `tool` are required"
        ent = get_server_by_name(sname)
        if ent is None:
            return f"Error: unknown MCP server `{sname}`"
        cwd = None
        if ent.cwd:
            p = Path(ent.cwd)
            cwd = p if p.is_absolute() else repo_root() / p
        try:
            res = await call_tool(ent.command, tname, args, cwd=cwd)
            return json.dumps(res, ensure_ascii=False, indent=2)
        except Exception as e:
            return f"Error calling MCP tool: {e}"
