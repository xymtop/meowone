"""Minimal MCP stdio JSON-RPC (newline-delimited) client — one process per operation."""
from __future__ import annotations

import asyncio
import json
import logging
import shlex
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class McpStdioSession:
    def __init__(self, command: str, cwd: Optional[Path] = None) -> None:
        self._argv = shlex.split(command, posix=True)
        self._cwd = str(cwd) if cwd else None
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._next_id = 1

    async def __aenter__(self) -> McpStdioSession:
        if not self._argv:
            raise ValueError("empty MCP command")
        self._proc = await asyncio.create_subprocess_exec(
            *self._argv,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self._cwd,
        )
        await self._handshake()
        return self

    async def __aexit__(self, *args: Any) -> None:
        if self._proc and self._proc.returncode is None:
            self._proc.kill()
            await self._proc.wait()
        self._proc = None

    async def _handshake(self) -> None:
        await self._request(
            "initialize",
            {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "meowone", "version": "0.2.0"},
            },
        )
        await self._notify("notifications/initialized", {})

    async def _notify(self, method: str, params: Dict[str, Any]) -> None:
        assert self._proc and self._proc.stdin
        msg = {"jsonrpc": "2.0", "method": method, "params": params}
        line = json.dumps(msg, ensure_ascii=False) + "\n"
        self._proc.stdin.write(line.encode("utf-8"))
        await self._proc.stdin.drain()

    async def _request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        assert self._proc and self._proc.stdin and self._proc.stdout
        req_id = self._next_id
        self._next_id += 1
        msg = {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params}
        line = json.dumps(msg, ensure_ascii=False) + "\n"
        self._proc.stdin.write(line.encode("utf-8"))
        await self._proc.stdin.drain()
        return await self._read_until_id(req_id)

    async def _read_until_id(self, req_id: int) -> Dict[str, Any]:
        assert self._proc and self._proc.stdout
        while True:
            raw = await asyncio.wait_for(self._proc.stdout.readline(), timeout=60.0)
            if not raw:
                err = await self._drain_stderr()
                raise RuntimeError(f"MCP EOF waiting for response id={req_id}. stderr={err!r}")
            line = raw.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("MCP non-JSON line: %s", line[:200])
                continue
            if obj.get("id") == req_id:
                if "error" in obj:
                    raise RuntimeError(obj["error"])
                return obj.get("result") or {}
            # ignore notifications / other ids

    async def _drain_stderr(self) -> str:
        if not self._proc or not self._proc.stderr:
            return ""
        err = await self._proc.stderr.read()
        return err.decode("utf-8", errors="replace")[:4000]

    async def tools_list(self) -> Dict[str, Any]:
        return await self._request("tools/list", {})

    async def resources_list(self) -> Dict[str, Any]:
        return await self._request("resources/list", {})

    async def tools_call(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        return await self._request(
            "tools/call",
            {"name": name, "arguments": arguments},
        )


async def list_tools_for_command(command: str, cwd: Optional[Path] = None) -> Dict[str, Any]:
    async with McpStdioSession(command, cwd=cwd) as sess:
        return await sess.tools_list()


async def list_resources_for_command(command: str, cwd: Optional[Path] = None) -> Dict[str, Any]:
    async with McpStdioSession(command, cwd=cwd) as sess:
        return await sess.resources_list()


async def call_tool(command: str, tool_name: str, arguments: Dict[str, Any], cwd: Optional[Path] = None) -> Dict[str, Any]:
    async with McpStdioSession(command, cwd=cwd) as sess:
        return await sess.tools_call(tool_name, arguments)
