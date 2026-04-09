from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


def _row_to_prompt(row: Dict[str, Any]) -> Dict[str, Any]:
    item = dict(row)
    try:
        tags = json.loads(item.get("tags_json") or "[]")
    except json.JSONDecodeError:
        tags = []
    item["tags"] = [str(x) for x in tags if str(x).strip()] if isinstance(tags, list) else []
    item.pop("tags_json", None)
    item["enabled"] = bool(item.get("enabled", 1))
    return item


async def list_prompts(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute(
                "SELECT * FROM prompts WHERE enabled = 1 ORDER BY prompt_key ASC"
            )
        else:
            cur = await db.execute("SELECT * FROM prompts ORDER BY prompt_key ASC")
        rows = await cur.fetchall()
    return [_row_to_prompt(dict(r)) for r in rows]


async def get_prompt(prompt_key: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM prompts WHERE prompt_key = ?", (prompt_key,))
        row = await cur.fetchone()
    return _row_to_prompt(dict(row)) if row else None


async def upsert_prompt(
    *,
    prompt_key: str,
    name: str,
    content_md: str,
    description: str = "",
    tags: Optional[List[str]] = None,
    enabled: bool = True,
) -> None:
    safe_tags = [x.strip() for x in (tags or []) if str(x).strip()]
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO prompts
            (id, prompt_key, name, content_md, description, tags_json, enabled, source, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'db', datetime('now'))
            ON CONFLICT(prompt_key) DO UPDATE SET
              name=excluded.name,
              content_md=excluded.content_md,
              description=excluded.description,
              tags_json=excluded.tags_json,
              enabled=excluded.enabled,
              source='db',
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                prompt_key,
                name,
                content_md,
                description,
                json.dumps(safe_tags, ensure_ascii=False),
                1 if enabled else 0,
            ),
        )
        await db.commit()


async def set_prompt_enabled(prompt_key: str, enabled: bool) -> bool:
    async with get_db() as db:
        cur = await db.execute(
            "UPDATE prompts SET enabled = ?, updated_at = datetime('now') WHERE prompt_key = ?",
            (1 if enabled else 0, prompt_key),
        )
        await db.commit()
    return (cur.rowcount or 0) > 0


async def delete_prompt(prompt_key: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM prompts WHERE prompt_key = ?", (prompt_key,))
        await db.commit()
    return (cur.rowcount or 0) > 0
