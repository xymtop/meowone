"""MCP SSE + HTTP POST client for remote MCP servers."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


async def call_mcp_tool_sse(
    url: Optional[str],
    tool_name: str,
    arguments: Dict[str, Any],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 60.0,
) -> Dict[str, Any]:
    """
    Call MCP tool via SSE transport (Server-Sent Events + HTTP POST).
    
    The SSE transport works as follows:
    1. Client POSTs to /tools/call with JSON-RPC request
    2. Server sends responses via SSE stream
    3. Final response contains the tool result
    """
    if not url:
        raise ValueError("URL is required for SSE transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for SSE transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    if auth_type == "bearer" and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    elif auth_type == "api-key" and auth_token:
        headers["X-API-Key"] = auth_token

    request_id = 1
    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    text = await response.aread()
                    raise RuntimeError(f"SSE request failed with status {response.status_code}: {text.decode()}")

                result = None
                current_event = ""
                current_data = ""

                async for line in response.aiter_lines():
                    line = line.rstrip("\r")
                    if not line:
                        continue

                    if line.startswith("event: "):
                        current_event = line[7:].strip()
                    elif line.startswith("data: "):
                        current_data = line[6:].strip()
                    elif line == "" and current_event and current_data:
                        try:
                            data_obj = json.loads(current_data)
                            if isinstance(data_obj, dict):
                                if "result" in data_obj:
                                    result = data_obj["result"]
                                elif "error" in data_obj:
                                    raise RuntimeError(f"MCP error: {data_obj['error']}")
                        except json.JSONDecodeError:
                            pass
                        current_event = ""
                        current_data = ""

                if result is None:
                    raise RuntimeError("No result received from MCP SSE server")

                return result

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")


async def list_mcp_tools_sse(
    url: Optional[str],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """List available tools from an MCP server via SSE transport."""
    if not url:
        raise ValueError("URL is required for SSE transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for SSE transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    if auth_type == "bearer" and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    elif auth_type == "api-key" and auth_token:
        headers["X-API-Key"] = auth_token

    request_id = 1
    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "tools/list",
        "params": {},
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    text = await response.aread()
                    raise RuntimeError(f"SSE request failed with status {response.status_code}: {text.decode()}")

                result = None
                current_event = ""
                current_data = ""

                async for line in response.aiter_lines():
                    line = line.rstrip("\r")
                    if not line:
                        continue

                    if line.startswith("event: "):
                        current_event = line[7:].strip()
                    elif line.startswith("data: "):
                        current_data = line[6:].strip()
                    elif line == "" and current_event and current_data:
                        try:
                            data_obj = json.loads(current_data)
                            if isinstance(data_obj, dict):
                                if "result" in data_obj:
                                    result = data_obj["result"]
                                elif "error" in data_obj:
                                    raise RuntimeError(f"MCP error: {data_obj['error']}")
                        except json.JSONDecodeError:
                            pass
                        current_event = ""
                        current_data = ""

                if result is None:
                    raise RuntimeError("No result received from MCP SSE server")

                return result

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")


async def list_mcp_resources_sse(
    url: Optional[str],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """List resources from an MCP server via SSE transport."""
    if not url:
        raise ValueError("URL is required for SSE transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for SSE transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    if auth_type == "bearer" and auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    elif auth_type == "api-key" and auth_token:
        headers["X-API-Key"] = auth_token

    request_id = 1
    payload = {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "resources/list",
        "params": {},
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    text = await response.aread()
                    raise RuntimeError(f"SSE request failed with status {response.status_code}: {text.decode()}")

                result = None
                current_event = ""
                current_data = ""

                async for line in response.aiter_lines():
                    line = line.rstrip("\r")
                    if not line:
                        continue

                    if line.startswith("event: "):
                        current_event = line[7:].strip()
                    elif line.startswith("data: "):
                        current_data = line[6:].strip()
                    elif line == "" and current_event and current_data:
                        try:
                            data_obj = json.loads(current_data)
                            if isinstance(data_obj, dict):
                                if "result" in data_obj:
                                    result = data_obj["result"]
                                elif "error" in data_obj:
                                    raise RuntimeError(f"MCP error: {data_obj['error']}")
                        except json.JSONDecodeError:
                            pass
                        current_event = ""
                        current_data = ""

                if result is None:
                    raise RuntimeError("No result received from MCP SSE server")

                return result

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")
