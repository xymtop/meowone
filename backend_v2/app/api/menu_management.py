from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services import menu_service

"""
# 菜单管理 API

管理前端导航菜单配置。

## 主要功能
- 列出所有菜单
- 获取菜单详情
- 创建/更新菜单
- 删除菜单

## 菜单层级
支持多级菜单，通过 `parent_key` 关联父级菜单。
"""
router = APIRouter(prefix="/api/menus", tags=["菜单管理"])


class MenuUpsertRequest(BaseModel):
    menu_key: str
    name: str
    path: str = ""
    component: str = ""
    icon: str = ""
    parent_key: Optional[str] = None
    sort: int = 0
    visible: bool = True
    enabled: bool = True
    meta: Dict[str, Any] = {}


@router.get("")
async def list_menus(flat: bool = Query(False)) -> Dict[str, Any]:
    items = await menu_service.list_menus(flat=flat)
    total = len(await menu_service.list_menus(flat=True))
    return {"count": total, "menus": items}


@router.get("/{menu_key}")
async def get_menu(menu_key: str) -> Dict[str, Any]:
    menu = await menu_service.get_menu(menu_key.strip())
    if not menu:
        raise HTTPException(status_code=404, detail="menu not found")
    return menu


@router.post("")
async def upsert_menu(body: MenuUpsertRequest) -> Dict[str, Any]:
    key = body.menu_key.strip()
    name = body.name.strip()
    if not key or not name:
        raise HTTPException(status_code=400, detail="menu_key and name are required")
    try:
        await menu_service.upsert_menu(
            menu_key=key,
            name=name,
            path=body.path.strip(),
            component=body.component.strip(),
            icon=body.icon.strip(),
            parent_key=(body.parent_key.strip() if body.parent_key and body.parent_key.strip() else None),
            sort=body.sort,
            visible=body.visible,
            enabled=body.enabled,
            meta=body.meta,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "menu_key": key}


@router.delete("/{menu_key}")
async def delete_menu(menu_key: str) -> Dict[str, Any]:
    key = menu_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="menu_key is required")
    deleted = await menu_service.delete_menu(key)
    return {"ok": True, "deleted": deleted}
