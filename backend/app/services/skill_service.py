from __future__ import annotations

import sqlite3
import uuid
from pathlib import Path
from typing import Any, Dict, List

from app.config import DATABASE_PATH, MEOWONE_CONFIG_DIR
from app.db.database import get_db


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _config_root() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p


def _skills_root() -> Path:
    return _config_root() / "skills"


def _parse_skill_md(path: Path) -> Dict[str, str]:
    raw = path.read_text(encoding="utf-8")
    text = raw.lstrip("\ufeff")
    if not text.startswith("---"):
        return {"name": path.parent.name, "description": "", "body": text.strip()}
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {"name": path.parent.name, "description": "", "body": text.strip()}
    fm, body = parts[1], parts[2]
    name = path.parent.name
    desc = ""
    for line in fm.splitlines():
        if line.strip().startswith("name:"):
            name = line.split(":", 1)[1].strip()
        elif line.strip().startswith("description:"):
            desc = line.split(":", 1)[1].strip()
    return {"name": name, "description": desc, "body": body.strip()}


def _sync_from_files_if_empty_sync() -> None:
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        count = conn.execute("SELECT COUNT(*) FROM skills").fetchone()[0]
        if count > 0:
            return
        root = _skills_root()
        if not root.is_dir():
            return
        for sk in sorted(root.iterdir()):
            if not sk.is_dir():
                continue
            md = sk / "SKILL.md"
            if not md.is_file():
                continue
            try:
                parsed = _parse_skill_md(md)
            except OSError:
                continue
            name = parsed["name"].strip() or sk.name
            desc = parsed["description"].strip()
            body = parsed["body"]
            if not desc:
                continue
            conn.execute(
                """
                INSERT OR IGNORE INTO skills (id, name, description, body, enabled, source)
                VALUES (?, ?, ?, ?, 1, 'file-import')
                """,
                (str(uuid.uuid4()), name, desc, body),
            )
        conn.commit()
    finally:
        conn.close()


def list_skills_sync(enabled_only: bool = True) -> List[Dict[str, Any]]:
    _sync_from_files_if_empty_sync()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        if enabled_only:
            rows = conn.execute(
                "SELECT name, description, body FROM skills WHERE enabled = 1 ORDER BY name ASC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT name, description, body, enabled FROM skills ORDER BY name ASC"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


async def list_skills(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        if enabled_only:
            cur = await db.execute(
                "SELECT name, description, body, enabled FROM skills WHERE enabled = 1 ORDER BY name ASC"
            )
        else:
            cur = await db.execute(
                "SELECT name, description, body, enabled FROM skills ORDER BY name ASC"
            )
        rows = await cur.fetchall()
        if rows:
            return [dict(r) for r in rows]
    _sync_from_files_if_empty_sync()
    async with get_db() as db:
        cur = await db.execute(
            "SELECT name, description, body, enabled FROM skills ORDER BY name ASC"
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]


async def upsert_skill(*, name: str, description: str, body: str = "") -> None:
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO skills (id, name, description, body, enabled, source, updated_at)
            VALUES (?, ?, ?, ?, 1, 'db', datetime('now'))
            ON CONFLICT(name) DO UPDATE SET
              description=excluded.description,
              body=excluded.body,
              enabled=1,
              source='db',
              updated_at=datetime('now')
            """,
            (str(uuid.uuid4()), name, description, body),
        )
        await db.commit()


async def delete_skill(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM skills WHERE name = ?", (name,))
        await db.commit()
        return (cur.rowcount or 0) > 0
