from __future__ import annotations

import json
import sqlite3
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.config import DATABASE_PATH
from app.db.database import get_db


@dataclass
class ExternalAgentEntry:
    tool_name: str
    description: str
    base_url: str
    protocol: str = "a2a"
    enabled: bool = True
    auth_token: Optional[str] = None


def _json_list(value: Optional[List[str]]) -> str:
    return json.dumps([x for x in (value or []) if str(x).strip()], ensure_ascii=False)


def _to_dict(row: Any) -> Dict[str, Any]:
    data = dict(row)
    for key in ("mcp_servers", "agent_skills", "allow_tools", "deny_tools"):
        raw = data.get(key)
        try:
            parsed = json.loads(raw or "[]")
        except Exception:
            parsed = []
        data[key] = [str(x) for x in parsed if str(x).strip()] if isinstance(parsed, list) else []
    data["enabled"] = bool(data.get("enabled", 1))
    try:
        data["metadata_json"] = json.loads(data.get("metadata_json") or "{}")
    except Exception:
        data["metadata_json"] = {}
    # 从 metadata_json 中提取 model_name 和 scheduler_mode
    metadata = data["metadata_json"]
    data["model_name"] = metadata.get("model_name", "") if isinstance(metadata, dict) else ""
    data["scheduler_mode"] = metadata.get("scheduler_mode", "direct") if isinstance(metadata, dict) else "direct"
    data["protocol"] = str(data.get("protocol") or "").strip() or (
        "a2a" if str(data.get("agent_type") or "") == "external" else "internal_loop"
    )
    return data


async def upsert_internal_agent(
    *,
    name: str,
    description: str = "",
    system_prompt: str = "",
    mcp_servers: Optional[List[str]] = None,
    agent_skills: Optional[List[str]] = None,
    allow_tools: Optional[List[str]] = None,
    deny_tools: Optional[List[str]] = None,
    max_rounds: Optional[int] = None,
    max_tool_phases: Optional[int] = None,
    timeout_seconds: Optional[int] = None,
    prompt_key: str = "",
    model_name: str = "",
    scheduler_mode: str = "direct",
    loop_mode: str = "react",
) -> None:
    async with get_db() as db:
        metadata = {
            "model_name": model_name,
            "scheduler_mode": scheduler_mode,
            "loop_mode": loop_mode,
        }
        await db.execute(
            """
            INSERT INTO agents (
              id, name, agent_type, description, system_prompt, mcp_servers, agent_skills,
              allow_tools, deny_tools, max_rounds, max_tool_phases, timeout_seconds, prompt_key,
              protocol, metadata_json, enabled, source, updated_at
            )
            VALUES (?, ?, 'internal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'internal_loop', ?, 1, 'db', datetime('now'))
            ON CONFLICT(agent_type, name) DO UPDATE SET
              description=excluded.description,
              system_prompt=excluded.system_prompt,
              mcp_servers=excluded.mcp_servers,
              agent_skills=excluded.agent_skills,
              allow_tools=excluded.allow_tools,
              deny_tools=excluded.deny_tools,
              max_rounds=excluded.max_rounds,
              max_tool_phases=excluded.max_tool_phases,
              timeout_seconds=excluded.timeout_seconds,
              prompt_key=excluded.prompt_key,
              protocol='internal_loop',
              metadata_json=excluded.metadata_json,
              enabled=1,
              source='db',
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                name,
                description,
                system_prompt,
                _json_list(mcp_servers),
                _json_list(agent_skills),
                _json_list(allow_tools),
                _json_list(deny_tools),
                max_rounds,
                max_tool_phases,
                timeout_seconds,
                prompt_key,
                json.dumps(metadata, ensure_ascii=False),
            ),
        )
        await db.commit()


async def upsert_external_agent(
    *,
    name: str,
    description: str,
    base_url: str,
    protocol: str = "a2a",
    auth_token: Optional[str] = None,
    enabled: bool = True,
) -> None:
    metadata = {"auth_token": auth_token} if auth_token else {}
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agents (
              id, name, agent_type, description, base_url, protocol, metadata_json, enabled, source, updated_at
            )
            VALUES (?, ?, 'external', ?, ?, ?, ?, ?, 'db', datetime('now'))
            ON CONFLICT(agent_type, name) DO UPDATE SET
              description=excluded.description,
              base_url=excluded.base_url,
              protocol=excluded.protocol,
              metadata_json=excluded.metadata_json,
              enabled=excluded.enabled,
              source='db',
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                name,
                description,
                base_url.rstrip("/"),
                protocol,
                json.dumps(metadata, ensure_ascii=False),
                1 if enabled else 0,
            ),
        )
        await db.commit()


async def list_agents(agent_type: Optional[str] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM agents"
    params: List[Any] = []
    if agent_type:
        query += " WHERE agent_type = ?"
        params.append(agent_type)
    query += " ORDER BY agent_type ASC, name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_to_dict(r) for r in rows]


async def get_agent(*, name: str, agent_type: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM agents WHERE agent_type = ? AND name = ? LIMIT 1",
            (agent_type, name),
        )
        row = await cur.fetchone()
    return _to_dict(row) if row else None


async def get_agent_by_id(agent_id: str) -> Optional[Dict[str, Any]]:
    aid = (agent_id or "").strip()
    if not aid:
        return None
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM agents WHERE id = ? LIMIT 1", (aid,))
        row = await cur.fetchone()
    return _to_dict(row) if row else None


async def delete_agent(*, name: str, agent_type: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM agents WHERE agent_type = ? AND name = ?",
            (agent_type, name),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


def list_external_agents_sync() -> List[ExternalAgentEntry]:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT name, description, base_url, enabled, metadata_json
            FROM agents
            WHERE agent_type = 'external' AND protocol = 'a2a' AND enabled = 1
            ORDER BY name ASC
            """
        ).fetchall()
        out: List[ExternalAgentEntry] = []
        for row in rows:
            base_url = str(row["base_url"] or "").strip()
            name = str(row["name"] or "").strip()
            if not name or not base_url:
                continue
            metadata = {}
            try:
                metadata = json.loads(row["metadata_json"] or "{}")
            except Exception:
                pass
            out.append(
                ExternalAgentEntry(
                    tool_name=name,
                    description=str(row["description"] or "").strip(),
                    base_url=base_url.rstrip("/"),
                    protocol="a2a",
                    enabled=bool(row["enabled"]),
                    auth_token=metadata.get("auth_token"),
                )
            )
        return out
    finally:
        conn.close()
