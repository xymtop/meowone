"""Expose MCP `tools/list` as a normal tool - supports stdio, SSE and Streamable HTTP."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.mcp.stdio_session import list_tools_for_command
from app.mcp.mcp_config import load_mcp_servers
from app.paths import repo_root


class ListMcpToolsTool(BaseTool):
    name = "list_mcp_tools"
    display_name = "List MCP tools"
    description = (
        "List tools exposed by configured MCP servers. "
        "Supports stdio (local process), SSE and Streamable HTTP (remote) transports. "
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
                "description": "Optional MCP server name; omit to query all.",
            },
        },
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        filt = str(params.get("server") or "").strip()
        servers = load_mcp_servers()
        if not servers:
            return "No MCP servers configured."
        out: Dict[str, Any] = {}
        for s in servers:
            if filt and s.name != filt:
                continue
            try:
                if s.transport == "stdio":
                    result = await self._list_stdio(s)
                elif s.transport == "sse":
                    result = await self._list_sse(s)
                elif s.transport == "streamable-http":
                    result = await self._list_streamable(s)
                else:
                    result = {"ok": False, "error": f"Unknown transport: {s.transport}"}

                out[s.name] = {
                    "ok": result.get("ok", True),
                    "tools": result.get("tools", result.get("result", {}).get("tools", [])),
                    "error": result.get("error"),
                    "transport": s.transport,
                }
            except Exception as e:
                out[s.name] = {"ok": False, "error": str(e), "transport": s.transport}

        if filt and not out:
            return f"No MCP server named `{filt}`."
        return json.dumps(out, ensure_ascii=False, indent=2)

    async def _list_stdio(self, s) -> Dict[str, Any]:
        cwd = None
        if s.cwd:
            p = Path(s.cwd)
            cwd = p if p.is_absolute() else repo_root() / p
        tl = await list_tools_for_command(s.command, cwd=cwd)
        return {"ok": True, "tools": tl.get("result", {}).get("tools", [])}

    async def _list_sse(self, s) -> Dict[str, Any]:
        try:
            from app.mcp.sse_client import list_mcp_tools_sse
            result = await list_mcp_tools_sse(
                url=s.url,
                auth_type=s.auth_type,
                auth_token=s.auth_token,
            )
            return {"ok": True, "tools": result.get("result", {}).get("tools", [])}
        except ImportError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    async def _list_streamable(self, s) -> Dict[str, Any]:
        try:
            from app.mcp.streamable_client import list_mcp_tools_streamable
            result = await list_mcp_tools_streamable(
                url=s.url,
                auth_type=s.auth_type,
                auth_token=s.auth_token,
            )
            return {"ok": True, "tools": result.get("result", {}).get("tools", [])}
        except ImportError as e:
            return {"ok": False, "error": str(e)}
        except Exception as e:
            return {"ok": False, "error": str(e)}
