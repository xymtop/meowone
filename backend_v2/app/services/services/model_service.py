from __future__ import annotations

import sqlite3
import uuid
from typing import Any, Dict, List, Optional

from app.config import DATABASE_PATH, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
from app.db.database import get_db


def _bootstrap_default_model_sync() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        count = conn.execute("SELECT COUNT(*) FROM llm_models").fetchone()[0]
        if count > 0:
            return
        conn.execute(
            """
            INSERT INTO llm_models
            (id, name, provider, base_url, api_key, is_default, enabled, source)
            VALUES (?, ?, 'openai-compatible', ?, ?, 1, 1, 'env-import')
            """,
            (str(uuid.uuid4()), LLM_MODEL, LLM_BASE_URL, LLM_API_KEY),
        )
        conn.commit()
    finally:
        conn.close()


def list_models_sync(enabled_only: bool = True) -> List[Dict[str, Any]]:
    _bootstrap_default_model_sync()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        if enabled_only:
            rows = conn.execute(
                """
                SELECT name, provider, base_url, api_key, is_default, enabled, extra_json
                FROM llm_models
                WHERE enabled = 1
                ORDER BY is_default DESC, name ASC
                """
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT name, provider, base_url, api_key, is_default, enabled, extra_json
                FROM llm_models
                ORDER BY is_default DESC, name ASC
                """
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def resolve_model_sync(requested_name: Optional[str]) -> Dict[str, Any]:
    rows = list_models_sync(enabled_only=True)
    if requested_name:
        target = requested_name.strip()
        for r in rows:
            if str(r.get("name") or "") == target:
                return r
    for r in rows:
        if int(r.get("is_default") or 0) == 1:
            return r
    return rows[0] if rows else {
        "name": LLM_MODEL,
        "base_url": LLM_BASE_URL,
        "api_key": LLM_API_KEY,
        "provider": "openai-compatible",
        "is_default": 1,
        "enabled": 1,
        "extra_json": "{}",
    }


async def list_models(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute(
                """
                SELECT name, provider, base_url, api_key, is_default, enabled, extra_json
                FROM llm_models
                WHERE enabled = 1
                ORDER BY is_default DESC, name ASC
                """
            )
        else:
            cur = await db.execute(
                """
                SELECT name, provider, base_url, api_key, is_default, enabled, extra_json
                FROM llm_models
                ORDER BY is_default DESC, name ASC
                """
            )
        rows = await cur.fetchall()
        return [dict(r) for r in rows] if rows else []


async def upsert_model(
    *,
    name: str,
    provider: str,
    base_url: str,
    api_key: str,
    enabled: bool = True,
    is_default: bool = False,
    extra_json: str = "{}",
) -> None:
    async with get_db() as db:
        if is_default:
            await db.execute("UPDATE llm_models SET is_default = 0")
        await db.execute(
            """
            INSERT INTO llm_models
            (id, name, provider, base_url, api_key, is_default, enabled, extra_json, source, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'db', datetime('now'))
            ON CONFLICT(name) DO UPDATE SET
              provider=excluded.provider,
              base_url=excluded.base_url,
              api_key=excluded.api_key,
              is_default=excluded.is_default,
              enabled=excluded.enabled,
              extra_json=excluded.extra_json,
              source='db',
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                name,
                provider,
                base_url,
                api_key,
                1 if is_default else 0,
                1 if enabled else 0,
                extra_json,
            ),
        )
        await db.commit()


async def delete_model(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM llm_models WHERE name = ?", (name,))
        await db.commit()
        return (cur.rowcount or 0) > 0


async def set_default_model(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("SELECT name FROM llm_models WHERE name = ? AND enabled = 1", (name,))
        row = await cur.fetchone()
        if not row:
            return False
        await db.execute("UPDATE llm_models SET is_default = 0")
        await db.execute("UPDATE llm_models SET is_default = 1 WHERE name = ?", (name,))
        await db.commit()
        return True
