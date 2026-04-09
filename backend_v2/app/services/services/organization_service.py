from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.db.database import get_db


@dataclass
class Organization:
    id: str
    name: str
    description: str
    parent_org_id: Optional[str]
    settings: Dict[str, Any]
    created_at: str
    updated_at: str


def _parse_org_row(row: Any) -> Dict[str, Any]:
    data = dict(row)
    try:
        data["settings"] = json.loads(data.get("settings_json") or "{}")
    except Exception:
        data["settings"] = {}
    data.pop("settings_json", None)
    return data


async def create_organization(
    *,
    name: str,
    description: str = "",
    parent_org_id: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    org_id = str(uuid.uuid4())
    settings_json = json.dumps(settings or {}, ensure_ascii=False)
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO organizations (id, name, description, parent_org_id, settings_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (org_id, name, description, parent_org_id, settings_json),
        )
        await db.commit()
    return await get_organization(org_id)


async def list_organizations(parent_org_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = "SELECT * FROM organizations"
    params: List[Any] = []
    if parent_org_id is not None:
        query += " WHERE parent_org_id = ?"
        params.append(parent_org_id)
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query, tuple(params))
        rows = await cur.fetchall()
    return [_parse_org_row(r) for r in rows]


async def get_organization(org_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            "SELECT * FROM organizations WHERE id = ? LIMIT 1",
            (org_id,),
        )
        row = await cur.fetchone()
    return _parse_org_row(row) if row else None


async def update_organization(
    org_id: str,
    *,
    name: Optional[str] = None,
    description: Optional[str] = None,
    parent_org_id: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    updates: List[str] = []
    params: List[Any] = []
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if description is not None:
        updates.append("description = ?")
        params.append(description)
    if parent_org_id is not None:
        updates.append("parent_org_id = ?")
        params.append(parent_org_id)
    if settings is not None:
        updates.append("settings_json = ?")
        params.append(json.dumps(settings, ensure_ascii=False))
    if not updates:
        return await get_organization(org_id)
    updates.append("updated_at = datetime('now')")
    params.append(org_id)
    async with get_db() as db:
        await db.execute(
            f"UPDATE organizations SET {', '.join(updates)} WHERE id = ?",
            tuple(params),
        )
        await db.commit()
    return await get_organization(org_id)


async def delete_organization(org_id: str) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "DELETE FROM organizations WHERE id = ?",
            (org_id,),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


async def get_org_stats(org_id: str) -> Dict[str, Any]:
    async with get_db() as db:
        # 团队数
        cur = await db.execute(
            "SELECT COUNT(*) as count FROM teams WHERE org_id = ?",
            (org_id,),
        )
        row = await cur.fetchone()
        team_count = dict(row)["count"] if row else 0

        # 直接成员数
        cur = await db.execute(
            "SELECT COUNT(*) as count FROM agents WHERE org_id = ?",
            (org_id,),
        )
        row = await cur.fetchone()
        agent_count = dict(row)["count"] if row else 0

        # 下级组织数
        cur = await db.execute(
            "SELECT COUNT(*) as count FROM organizations WHERE parent_org_id = ?",
            (org_id,),
        )
        row = await cur.fetchone()
        child_org_count = dict(row)["count"] if row else 0

    return {
        "team_count": team_count,
        "agent_count": agent_count,
        "child_org_count": child_org_count,
    }
