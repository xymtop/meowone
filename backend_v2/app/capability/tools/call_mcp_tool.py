"""Call an MCP tool via stdio, SSE or Streamable HTTP — implements the common 'MCP as tools' pattern."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.mcp.mcp.stdio_session import call_tool as call_stdio_tool
from app.mcp.mcp.mcp_config import get_server_by_name
from app.paths import repo_root

logger = logging.getLogger(__name__)


class CallMcpToolTool(BaseTool):
    name = "call_mcp_tool"
    display_name = "Call MCP tool"
    description = (
        "Invoke a tool on a configured MCP server. "
        "Use `list_mcp_tools` first to see tool names and schemas. "
        "Supports stdio, SSE and Streamable HTTP transports."
    )
    permission = "sensitive"
    category = "mcp"
    tags = ("mcp",)

    parameters_schema = {
        "type": "object",
        "properties": {
            "server": {
                "type": "string",
                "description": "MCP server name from configuration",
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

        if ent.transport == "stdio":
            return await self._call_stdio(ent, tname, args)
        elif ent.transport == "sse":
            return await self._call_sse(ent, tname, args)
        elif ent.transport == "streamable-http":
            return await self._call_streamable_http(ent, tname, args)
        else:
            return f"Error: unsupported transport type `{ent.transport}`"

    async def _call_stdio(self, ent, tname: str, args: Dict[str, Any]) -> str:
        cwd = None
        if ent.cwd:
            p = Path(ent.cwd)
            cwd = p if p.is_absolute() else repo_root() / p
        try:
            res = await call_stdio_tool(ent.command, tname, args, cwd=cwd)
            return json.dumps(res, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error("MCP stdio call failed: %s", e)
            return f"Error calling MCP tool via stdio: {e}"

    async def _call_sse(self, ent, tname: str, args: Dict[str, Any]) -> str:
        try:
            from app.mcp.mcp.sse_client import call_mcp_tool_sse
            res = await call_mcp_tool_sse(
                url=ent.url,
                tool_name=tname,
                arguments=args,
                auth_type=ent.auth_type,
                auth_token=ent.auth_token,
            )
            return json.dumps(res, ensure_ascii=False, indent=2)
        except ImportError:
            return "Error: SSE transport requires httpx and sseclient-py packages. Install with: pip install httpx sseclient-py"
        except Exception as e:
            logger.error("MCP SSE call failed: %s", e)
            return f"Error calling MCP tool via SSE: {e}"

    async def _call_streamable_http(self, ent, tname: str, args: Dict[str, Any]) -> str:
        try:
            from app.mcp.mcp.streamable_client import call_mcp_tool_streamable
            res = await call_mcp_tool_streamable(
                url=ent.url,
                tool_name=tname,
                arguments=args,
                auth_type=ent.auth_type,
                auth_token=ent.auth_token,
            )
            return json.dumps(res, ensure_ascii=False, indent=2)
        except ImportError:
            return "Error: Streamable HTTP transport requires httpx package. Install with: pip install httpx"
        except Exception as e:
            logger.error("MCP Streamable HTTP call failed: %s", e)
            return f"Error calling MCP tool via Streamable HTTP: {e}"
