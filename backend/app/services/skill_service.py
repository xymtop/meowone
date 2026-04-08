from __future__ import annotations

import json
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


def _parse_skill_md(path: Path) -> Dict[str, Any]:
    """解析 SKILL.md 文件，返回元数据和正文"""
    raw = path.read_text(encoding="utf-8")
    text = raw.lstrip("\ufeff")
    if not text.startswith("---"):
        return {
            "name": path.parent.name,
            "description": "",
            "body": text.strip(),
            "trigger_keywords": [],
            "category": "general",
            "examples": [],
            "version": "1.0.0",
        }
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {
            "name": path.parent.name,
            "description": "",
            "body": text.strip(),
            "trigger_keywords": [],
            "category": "general",
            "examples": [],
            "version": "1.0.0",
        }
    fm, body = parts[1], parts[2]

    result: Dict[str, Any] = {
        "name": path.parent.name,
        "description": "",
        "body": body.strip(),
        "trigger_keywords": [],
        "category": "general",
        "examples": [],
        "version": "1.0.0",
    }

    for line in fm.splitlines():
        line = line.strip()
        if line.startswith("name:"):
            result["name"] = line.split(":", 1)[1].strip()
        elif line.startswith("description:"):
            result["description"] = line.split(":", 1)[1].strip()
        elif line.startswith("trigger_keywords:"):
            try:
                keywords_str = line.split(":", 1)[1].strip()
                if keywords_str.startswith("["):
                    result["trigger_keywords"] = json.loads(keywords_str)
                else:
                    result["trigger_keywords"] = [k.strip() for k in keywords_str.split(",") if k.strip()]
            except (json.JSONDecodeError, ValueError):
                pass
        elif line.startswith("category:"):
            result["category"] = line.split(":", 1)[1].strip()
        elif line.startswith("version:"):
            result["version"] = line.split(":", 1)[1].strip().strip('"').strip("'")

    return result


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
                INSERT OR IGNORE INTO skills (id, name, description, body, enabled, source,
                                               trigger_keywords, category, examples, version)
                VALUES (?, ?, ?, ?, 1, 'file-import', ?, ?, ?, ?)
                """,
                (
                    str(uuid.uuid4()),
                    name,
                    desc,
                    body,
                    json.dumps(parsed.get("trigger_keywords", [])),
                    parsed.get("category", "general"),
                    json.dumps(parsed.get("examples", [])),
                    parsed.get("version", "1.0.0"),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def list_skills_sync(enabled_only: bool = True) -> List[Dict[str, Any]]:
    _sync_from_files_if_empty_sync()
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cols = "name, description, body, enabled, trigger_keywords, category, examples, version"
        if enabled_only:
            rows = conn.execute(
                f"SELECT {cols} FROM skills WHERE enabled = 1 ORDER BY category, name ASC"
            ).fetchall()
        else:
            rows = conn.execute(
                f"SELECT {cols} FROM skills ORDER BY category, name ASC"
            ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["trigger_keywords"] = json.loads(d.get("trigger_keywords", "[]"))
                d["examples"] = json.loads(d.get("examples", "[]"))
            except (json.JSONDecodeError, TypeError):
                d["trigger_keywords"] = []
                d["examples"] = []
            result.append(d)
        return result
    finally:
        conn.close()


async def list_skills(enabled_only: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cols = "name, description, body, enabled, trigger_keywords, category, examples, version"
        if enabled_only:
            cur = await db.execute(
                f"SELECT {cols} FROM skills WHERE enabled = 1 ORDER BY category, name ASC"
            )
        else:
            cur = await db.execute(
                f"SELECT {cols} FROM skills ORDER BY category, name ASC"
            )
        rows = await cur.fetchall()
        if rows:
            result = []
            for r in rows:
                d = dict(r)
                try:
                    d["trigger_keywords"] = json.loads(d.get("trigger_keywords", "[]"))
                    d["examples"] = json.loads(d.get("examples", "[]"))
                except (json.JSONDecodeError, TypeError):
                    d["trigger_keywords"] = []
                    d["examples"] = []
                result.append(d)
            return result
    _sync_from_files_if_empty_sync()
    async with get_db() as db:
        cols = "name, description, body, enabled, trigger_keywords, category, examples, version"
        cur = await db.execute(
            f"SELECT {cols} FROM skills ORDER BY category, name ASC"
        )
        rows = await cur.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["trigger_keywords"] = json.loads(d.get("trigger_keywords", "[]"))
                d["examples"] = json.loads(d.get("examples", "[]"))
            except (json.JSONDecodeError, TypeError):
                d["trigger_keywords"] = []
                d["examples"] = []
            result.append(d)
        return result


async def upsert_skill(
    *,
    name: str,
    description: str,
    body: str = "",
    trigger_keywords: List[str] = None,
    category: str = "general",
    examples: List[str] = None,
    version: str = "1.0.0",
) -> None:
    if trigger_keywords is None:
        trigger_keywords = []
    if examples is None:
        examples = []

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO skills (id, name, description, body, enabled, source, updated_at,
                               trigger_keywords, category, examples, version)
            VALUES (?, ?, ?, ?, 1, 'db', datetime('now'), ?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
              description=excluded.description,
              body=excluded.body,
              enabled=1,
              source='db',
              updated_at=datetime('now'),
              trigger_keywords=excluded.trigger_keywords,
              category=excluded.category,
              examples=excluded.examples,
              version=excluded.version
            """,
            (
                str(uuid.uuid4()),
                name,
                description,
                body,
                json.dumps(trigger_keywords),
                category,
                json.dumps(examples),
                version,
            ),
        )
        await db.commit()


async def delete_skill(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM skills WHERE name = ?", (name,))
        await db.commit()
        return (cur.rowcount or 0) > 0
