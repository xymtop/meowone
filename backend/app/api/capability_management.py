from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config_loaders import invalidate_config_cache
from app.services.mcp_service import (
    delete_mcp_server as delete_mcp_server_record,
    list_mcp_servers as list_mcp_servers_records,
    upsert_mcp_server as upsert_mcp_server_record,
)
from app.services.skill_service import (
    delete_skill as delete_skill_record,
    list_skills as list_skill_records,
    upsert_skill as upsert_skill_record,
)

router = APIRouter(prefix="/api/capabilities", tags=["capability-management"])


class McpServerUpsertRequest(BaseModel):
    name: str
    command: str
    description: str = ""
    cwd: Optional[str] = None


class SkillUpsertRequest(BaseModel):
    name: str
    description: str
    body: str = ""


@router.get("/mcp")
async def list_mcp_servers() -> Dict[str, Any]:
    servers = await list_mcp_servers_records(enabled_only=False)
    return {"count": len(servers), "servers": servers}


@router.post("/mcp")
async def upsert_mcp_server(body: McpServerUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    command = body.command.strip()
    if not name or not command:
        raise HTTPException(status_code=400, detail="name and command are required")

    await upsert_mcp_server_record(
        name=name,
        command=command,
        description=body.description.strip(),
        cwd=(body.cwd.strip() if body.cwd and body.cwd.strip() else None),
    )
    invalidate_config_cache()
    return {"ok": True, "name": name}


@router.delete("/mcp/{name}")
async def delete_mcp_server(name: str) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    deleted = await delete_mcp_server_record(target)
    invalidate_config_cache()
    return {"ok": True, "deleted": deleted}


@router.get("/skills")
async def list_skills() -> Dict[str, Any]:
    rows = await list_skill_records(enabled_only=False)
    skills = [{"name": r["name"], "description": r["description"], "enabled": r.get("enabled", 1)} for r in rows]
    return {"count": len(skills), "skills": skills}


@router.post("/skills")
async def upsert_skill(body: SkillUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    description = body.description.strip()
    if not name or not description:
        raise HTTPException(status_code=400, detail="name and description are required")
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(status_code=400, detail="invalid skill name")

    await upsert_skill_record(name=name, description=description, body=body.body.strip())
    invalidate_config_cache()
    return {"ok": True, "name": name}


@router.delete("/skills/{name}")
async def delete_skill(name: str) -> Dict[str, Any]:
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")
    if "/" in target or "\\" in target or target.startswith("."):
        raise HTTPException(status_code=400, detail="invalid skill name")
    deleted = await delete_skill_record(target)
    invalidate_config_cache()
    return {"ok": True, "deleted": deleted}
