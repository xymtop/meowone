from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


def _row_to_menu(row: Dict[str, Any]) -> Dict[str, Any]:
    menu = dict(row)
    try:
        menu["meta"] = json.loads(menu.get("meta_json") or "{}")
    except json.JSONDecodeError:
        menu["meta"] = {}
    menu.pop("meta_json", None)
    menu["visible"] = bool(menu.get("visible", 1))
    menu["enabled"] = bool(menu.get("enabled", 1))
    return menu


async def list_menus(flat: bool = False) -> List[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT *
            FROM menus
            ORDER BY COALESCE(parent_key, ''), sort ASC, name ASC
            """
        )
        rows = await cur.fetchall()
    items = [_row_to_menu(dict(r)) for r in rows]
    if flat:
        return items
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    for item in items:
        parent = item.get("parent_key")
        by_parent.setdefault(parent, []).append(item)
    for item in items:
        item["children"] = by_parent.get(item.get("menu_key"), [])
    return by_parent.get(None, []) + by_parent.get("", [])


async def get_menu(menu_key: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM menus WHERE menu_key = ?", (menu_key,))
        row = await cur.fetchone()
        return _row_to_menu(dict(row)) if row else None


async def upsert_menu(
    *,
    menu_key: str,
    name: str,
    path: str = "",
    component: str = "",
    icon: str = "",
    parent_key: Optional[str] = None,
    sort: int = 0,
    visible: bool = True,
    enabled: bool = True,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    if parent_key and parent_key == menu_key:
        raise ValueError("parent_key cannot equal menu_key")
    async with get_db() as db:
        if parent_key:
            cur = await db.execute("SELECT menu_key FROM menus WHERE menu_key = ?", (parent_key,))
            parent = await cur.fetchone()
            if not parent:
                raise ValueError(f"parent menu not found: {parent_key}")
        await db.execute(
            """
            INSERT INTO menus
            (id, menu_key, name, path, component, icon, parent_key, sort, visible, enabled, meta_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(menu_key) DO UPDATE SET
              name=excluded.name,
              path=excluded.path,
              component=excluded.component,
              icon=excluded.icon,
              parent_key=excluded.parent_key,
              sort=excluded.sort,
              visible=excluded.visible,
              enabled=excluded.enabled,
              meta_json=excluded.meta_json,
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                menu_key,
                name,
                path,
                component,
                icon,
                parent_key,
                sort,
                1 if visible else 0,
                1 if enabled else 0,
                json.dumps(meta or {}, ensure_ascii=False),
            ),
        )
        await db.commit()


async def delete_menu(menu_key: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM menus WHERE menu_key = ?", (menu_key,))
        await db.execute("UPDATE menus SET parent_key = NULL WHERE parent_key = ?", (menu_key,))
        await db.commit()
        return (cur.rowcount or 0) > 0
