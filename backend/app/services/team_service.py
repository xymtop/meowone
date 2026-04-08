from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.db.database import get_db


@dataclass
class Team:
    id: str
    name: str
    description: str
    org_id: str
    parent_team_id: Optional[str]
    leader_agent_id: Optional[str]
    default_strategy: str
    strategy_config: Dict[str, Any]
    created_at: str
    updated_at: str


def _parse_team_row(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["strategy_config"] = json.loads(data.get("strategy_config_json") or "{}")
    except Exception:
        data["strategy_config"] = {}
    data.pop("strategy_config_json", None)
    return data


async def create_team(
    *,
    name: str,
    org_id: str,
    description: str = "",
    parent_team_id: Optional[str] = None,
    leader_agent_id: Optional[str] = None,
    default_strategy: str = "direct",
    strategy_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    team_id = str(uuid.uuid4())
    strategy_config_json = json.dumps(strategy_config or {}, ensure_ascii=False)
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO teams (id, name, description, org_id, parent_team_id, leader_agent_id, default_strategy, strategy_config_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (team_id, name, description, org_id, parent_team_id, leader_agent_id, default_strategy, strategy_config_json),
        )
        await db.commit()
    return await get_team(team_id)


async def list_teams(org_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM teams"
    params: List[Any] = []
    if org_id:
        query += " WHERE org_id = ?"
        params.append(org_id)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_parse_team_row(r) for r in rows]


async def get_team(team_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM teams WHERE id = ? LIMIT 1",
            (team_id,),
        )
        row = await cur.fetchone()
    return _parse_team_row(row) if row else None


async def update_team(
    team_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    parent_team_id: Optional[str] = None,
    leader_agent_id: Optional[str] = None,
    default_strategy: Optional[str] = None,
    strategy_config: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    updates: List[str] = []
    params: List[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if parent_team_id is not None:
        updates.append("parent_team_id = ?")
        params.append(parent_team_id)
    if leader_agent_id is not None:
        updates.append("leader_agent_id = ?")
        params.append(leader_agent_id)
    if default_strategy is not None:
        updates.append("default_strategy = ?")
        params.append(default_strategy)
    if strategy_config is not None:
        updates.append("strategy_config_json = ?")
        params.append(json.dumps(strategy_config, ensure_ascii=False))
    if not updates:
        return await get_team(team_id)
    updates.append("updated_at = datetime('now')")
    params.append(team_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE teams SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_team(team_id)


async def delete_team(team_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM teams WHERE id = ?",
            (team_id,),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


async def add_team_member(team_id: str, agent_id: str, role: str = "member") -> None:
    async with get_db() as db:
        await db.execute(
            """
            INSERT OR IGNORE INTO team_members (team_id, agent_id, role)
            VALUES (?, ?, ?)
            """,
            (team_id, agent_id, role),
        )
        await db.commit()


async def remove_team_member(team_id: str, agent_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM team_members WHERE team_id = ? AND agent_id = ?",
            (team_id, agent_id),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


async def list_team_members(team_id: str) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT tm.role, tm.joined_at, a.*
            FROM team_members tm
            JOIN agents a ON a.id = tm.agent_id
            WHERE tm.team_id = ?
            ORDER BY tm.joined_at ASC
            """,
            (team_id,),
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def get_team_stats(team_id: str) -> Dict[str, Any]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT COUNT(*) as count FROM team_members WHERE team_id = ?",
            (team_id,),
        )
        row = await cur.fetchone()
        member_count = dict(row)["count"] if row else 0
    return {"member_count": member_count}
