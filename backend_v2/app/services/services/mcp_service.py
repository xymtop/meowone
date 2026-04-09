from __future__ import annotations

import json
import shlex
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

from app.config import DATABASE_PATH, MEOWONE_CONFIG_DIR
from app.db.database import get_db


@dataclass
class McpServer:
    name: str
    command: Optional[str] = None
    cwd: Optional[str] = None
    description: str = ""
    enabled: int = 1
    source: str = "db"
    transport: str = "stdio"
    url: Optional[str] = None
    auth_type: str = "none"
    auth_token: Optional[str] = None
    env_json: str = "{}"


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _config_root() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p


def _mcp_json_path() -> Path:
    return _config_root() / "mcp.json"


def _command_from_parts(command: str, args: Any) -> str:
    cmd = str(command or "").strip()
    if isinstance(args, list) and args:
        argv = [cmd] + [str(x) for x in args]
        return shlex.join(argv)
    return cmd


def _sync_from_file_if_empty_sync() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        count = conn.execute("SELECT COUNT(*) FROM mcp_servers").fetchone()[0]
        if count > 0:
            return
        path = _mcp_json_path()
        if not path.is_file():
            return
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        if not isinstance(raw, dict):
            return
        servers = raw.get("servers")
        if not isinstance(servers, list):
            servers = []
        for item in servers:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            command = _command_from_parts(str(item.get("command") or ""), item.get("args"))
            if not name or not command:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO mcp_servers (id, name, command, cwd, description, enabled, source, transport)
                VALUES (?, ?, ?, ?, ?, 1, 'file-import', 'stdio')
                """,
                (
                    str(uuid.uuid4()),
                    name,
                    command,
                    str(item.get("cwd") or "").strip() or None,
                    str(item.get("description") or "").strip(),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def list_mcp_servers_sync(enabled_only: bool = True) -> List[Dict[str, Any]]:
    _sync_from_file_if_empty_sync()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cols = "name, command, cwd, description, enabled, transport, url, auth_type, auth_token, env_json"
        if enabled_only:
            rows = conn.execute(
                f"SELECT {cols} FROM mcp_servers WHERE enabled = 1 ORDER BY name ASC"
            ).fetchall()
        else:
            rows = conn.execute(
                f"SELECT {cols} FROM mcp_servers ORDER BY name ASC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


async def list_mcp_servers(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cols = "name, command, cwd, description, enabled, transport, url, auth_type, auth_token, env_json"
        if enabled_only:
            cur = await db.execute(
                f"SELECT {cols} FROM mcp_servers WHERE enabled = 1 ORDER BY name ASC"
            )
        else:
            cur = await db.execute(
                f"SELECT {cols} FROM mcp_servers ORDER BY name ASC"
            )
        rows = await cur.fetchall()
        if rows:
            return [dict(r) for r in rows]
    _sync_from_file_if_empty_sync()
    async with get_db() as db:
        cols = "name, command, cwd, description, enabled, transport, url, auth_type, auth_token, env_json"
        cur = await db.execute(
            f"SELECT {cols} FROM mcp_servers ORDER BY name ASC"
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def upsert_mcp_server(
    *,
    name: str,
    command: Optional[str] = None,
    description: str = "",
    cwd: Optional[str] = None,
    transport: str = "stdio",
    url: Optional[str] = None,
    auth_type: str = "none",
    auth_token: Optional[str] = None,
    env_json: str = "{}",
) -> None:
    async with get_db() as db:
        # 确保 command 不为 None（SQLite NOT NULL 约束）
        cmd_value = command if command else ""
        await db.execute(
            """
            INSERT INTO mcp_servers (id, name, command, cwd, description, enabled, source, updated_at,
                                     transport, url, auth_type, auth_token, env_json)
            VALUES (?, ?, ?, ?, ?, 1, 'db', datetime('now'), ?, ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
              command=excluded.command,
              cwd=excluded.cwd,
              description=excluded.description,
              enabled=1,
              source='db',
              updated_at=datetime('now'),
              transport=excluded.transport,
              url=excluded.url,
              auth_type=excluded.auth_type,
              auth_token=excluded.auth_token,
              env_json=excluded.env_json
            """,
            (str(uuid.uuid4()), name, cmd_value, cwd, description,
             transport, url, auth_type, auth_token, env_json),
        )
        await db.commit()


async def delete_mcp_server(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM mcp_servers WHERE name = ?", (name,))
        await db.commit()
        return (cur.rowcount or 0) > 0


async def get_mcp_server(name: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            """SELECT name, command, cwd, description, enabled, transport, url, auth_type, auth_token, env_json
               FROM mcp_servers WHERE name = ?""",
            (name,),
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_mcp_server_by_name(name: str) -> Optional[McpServer]:
    """根据名称获取 MCP 服务器配置"""
    server = await get_mcp_server(name)
    if not server:
        return None
    return McpServer(
        name=server.get("name", ""),
        command=server.get("command"),
        cwd=server.get("cwd"),
        description=server.get("description", ""),
        enabled=server.get("enabled", 1),
        source=server.get("source", "db"),
        transport=server.get("transport", "stdio"),
        url=server.get("url"),
        auth_type=server.get("auth_type", "none"),
        auth_token=server.get("auth_token"),
        env_json=server.get("env_json", "{}"),
    )


def _tools_from_mcp_result(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not result:
        return []
    if isinstance(result.get("tools"), list):
        return result["tools"]
    inner = result.get("result")
    if isinstance(inner, dict) and isinstance(inner.get("tools"), list):
        return inner["tools"]
    return []


def _resources_from_mcp_result(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not result:
        return []
    if isinstance(result.get("resources"), list):
        return result["resources"]
    inner = result.get("result")
    if isinstance(inner, dict) and isinstance(inner.get("resources"), list):
        return inner["resources"]
    return []


async def list_mcp_tools(name: str) -> List[Dict[str, Any]]:
    """获取 MCP 服务器的工具列表"""
    from app.mcp.mcp_config import get_server_by_name
    
    server = get_server_by_name(name)
    if not server:
        return []
    
    tools: List[Dict[str, Any]] = []
    
    try:
        if server.transport == "stdio" and server.command:
            from app.mcp.stdio_session import list_tools_for_command
            from pathlib import Path
            from app.paths import repo_root
            
            cwd = None
            if server.cwd:
                p = Path(server.cwd)
                cwd = p if p.is_absolute() else repo_root() / p
            result = await list_tools_for_command(server.command, cwd=cwd)
            tool_list = _tools_from_mcp_result(result)
            for t in tool_list:
                tools.append({
                    "name": t.get("name", ""),
                    "description": t.get("description", ""),
                    "inputSchema": t.get("inputSchema"),
                })
        elif server.transport == "sse" and server.url:
            from app.mcp.sse_client import list_mcp_tools_sse
            result = await list_mcp_tools_sse(
                url=server.url,
                auth_type=server.auth_type,
                auth_token=server.auth_token,
            )
            tool_list = _tools_from_mcp_result(result)
            for t in tool_list:
                tools.append({
                    "name": t.get("name", ""),
                    "description": t.get("description", ""),
                    "inputSchema": t.get("inputSchema"),
                })
        elif server.transport == "streamable-http" and server.url:
            from app.mcp.streamable_client import list_mcp_tools_streamable
            result = await list_mcp_tools_streamable(
                url=server.url,
                auth_type=server.auth_type,
                auth_token=server.auth_token,
            )
            tool_list = _tools_from_mcp_result(result)
            for t in tool_list:
                tools.append({
                    "name": t.get("name", ""),
                    "description": t.get("description", ""),
                    "inputSchema": t.get("inputSchema"),
                })
    except Exception:
        pass
    
    return tools


async def list_mcp_resources(name: str) -> tuple[List[Dict[str, Any]], Optional[str]]:
    """获取 MCP 服务器的资源列表；不支持或失败时返回空列表与可选错误信息。"""
    from app.mcp.mcp_config import get_server_by_name

    server = get_server_by_name(name)
    if not server:
        return [], "server not found"

    out: List[Dict[str, Any]] = []
    try:
        if server.transport == "stdio" and server.command:
            from app.mcp.stdio_session import list_resources_for_command
            from pathlib import Path
            from app.paths import repo_root

            cwd = None
            if server.cwd:
                p = Path(server.cwd)
                cwd = p if p.is_absolute() else repo_root() / p
            result = await list_resources_for_command(server.command, cwd=cwd)
            for r in _resources_from_mcp_result(result):
                out.append({
                    "uri": r.get("uri", ""),
                    "name": r.get("name", ""),
                    "description": r.get("description", ""),
                    "mimeType": r.get("mimeType"),
                })
        elif server.transport == "sse" and server.url:
            from app.mcp.sse_client import list_mcp_resources_sse

            result = await list_mcp_resources_sse(
                url=server.url,
                auth_type=server.auth_type,
                auth_token=server.auth_token,
            )
            for r in _resources_from_mcp_result(result):
                out.append({
                    "uri": r.get("uri", ""),
                    "name": r.get("name", ""),
                    "description": r.get("description", ""),
                    "mimeType": r.get("mimeType"),
                })
        elif server.transport == "streamable-http" and server.url:
            from app.mcp.streamable_client import list_mcp_resources_streamable

            result = await list_mcp_resources_streamable(
                url=server.url,
                auth_type=server.auth_type,
                auth_token=server.auth_token,
            )
            for r in _resources_from_mcp_result(result):
                out.append({
                    "uri": r.get("uri", ""),
                    "name": r.get("name", ""),
                    "description": r.get("description", ""),
                    "mimeType": r.get("mimeType"),
                })
        return out, None
    except Exception as e:
        return [], str(e)
