"""MCP Streamable HTTP client for remote MCP servers."""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


async def call_mcp_tool_streamable(
    url: Optional[str],
    tool_name: str,
    arguments: Dict[str, Any],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 60.0,
) -> Dict[str, Any]:
    """
    Call MCP tool via Streamable HTTP transport.
    
    The Streamable HTTP transport is a bidirectional streaming protocol:
    1. Uses HTTP POST with streaming response
    2. Supports both request-response and streaming modes
    3. Based on the MCP 1.x specification
    """
    if not url:
        raise ValueError("URL is required for Streamable HTTP transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for Streamable HTTP transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}

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
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                raise RuntimeError(f"Streamable HTTP request failed with status {response.status_code}: {response.text}")

            content_type = response.headers.get("content-type", "")

            if "text/event-stream" in content_type:
                result = None
                current_event = ""
                current_data = ""

                for line in response.text.split("\n"):
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
                    raise RuntimeError("No result received from MCP Streamable HTTP server")
                return result
            else:
                result = response.json()
                if "error" in result:
                    raise RuntimeError(f"MCP error: {result['error']}")
                return result.get("result", {})

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")


async def list_mcp_tools_streamable(
    url: Optional[str],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """List available tools from an MCP server via Streamable HTTP transport."""
    if not url:
        raise ValueError("URL is required for Streamable HTTP transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for Streamable HTTP transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}

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
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                raise RuntimeError(f"Streamable HTTP request failed with status {response.status_code}: {response.text}")

            content_type = response.headers.get("content-type", "")

            if "text/event-stream" in content_type:
                result = None
                current_event = ""
                current_data = ""

                for line in response.text.split("\n"):
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
                    raise RuntimeError("No result received from MCP Streamable HTTP server")
                return result
            else:
                result = response.json()
                if "error" in result:
                    raise RuntimeError(f"MCP error: {result['error']}")
                return result.get("result", {})

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")


async def list_mcp_resources_streamable(
    url: Optional[str],
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    """List resources from an MCP server via Streamable HTTP transport."""
    if not url:
        raise ValueError("URL is required for Streamable HTTP transport")

    try:
        import httpx
    except ImportError:
        raise ImportError("httpx is required for Streamable HTTP transport. Install with: pip install httpx")

    headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}

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
            response = await client.post(url, json=payload, headers=headers)

            if response.status_code != 200:
                raise RuntimeError(f"Streamable HTTP request failed with status {response.status_code}: {response.text}")

            content_type = response.headers.get("content-type", "")

            if "text/event-stream" in content_type:
                result = None
                current_event = ""
                current_data = ""

                for line in response.text.split("\n"):
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
                    raise RuntimeError("No result received from MCP Streamable HTTP server")
                return result
            else:
                result = response.json()
                if "error" in result:
                    raise RuntimeError(f"MCP error: {result['error']}")
                return result.get("result", {})

        except httpx.ConnectError as e:
            raise RuntimeError(f"Failed to connect to MCP server at {url}: {e}")
        except httpx.TimeoutException as e:
            raise RuntimeError(f"MCP request timed out after {timeout}s: {e}")
