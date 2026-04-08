from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
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
from app.services.skill_fs import (
    list_skills_as_dicts,
    get_skill_as_dict,
    create_skill,
    delete_skill,
    read_skill_file as read_skill_file_fs,
    update_skill_file,
)

router = APIRouter(prefix="/api/capabilities", tags=["capability-management"])


class McpServerUpsertRequest(BaseModel):
    name: str
    command: Optional[str] = None
    description: str = ""
    cwd: Optional[str] = None
    transport: str = "stdio"
    url: Optional[str] = None
    auth_type: str = "none"
    auth_token: Optional[str] = None
    env_json: str = "{}"


class SkillUpsertRequest(BaseModel):
    name: str
    description: str
    body: str = ""
    trigger_keywords: List[str] = []
    category: str = "general"
    examples: List[str] = []
    version: str = "1.0.0"


class SkillCreateRequest(BaseModel):
    name: str
    description: str = ""
    category: str = "general"
    trigger_keywords: List[str] = []
    examples: List[str] = []


class SkillUpdateFileRequest(BaseModel):
    file_path: str
    content: str


@router.get("/mcp")
async def list_mcp_servers() -> Dict[str, Any]:
    servers = await list_mcp_servers_records(enabled_only=False)
    return {"count": len(servers), "servers": servers}


@router.post("/mcp")
async def upsert_mcp_server(body: McpServerUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")

    command = body.command.strip() if body.command else None
    url = body.url.strip() if body.url else None

    if body.transport == "stdio" and not command:
        raise HTTPException(status_code=400, detail="command is required for stdio transport")
    if body.transport in ("sse", "streamable-http") and not url:
        raise HTTPException(status_code=400, detail="url is required for remote transports")

    await upsert_mcp_server_record(
        name=name,
        command=command,
        description=body.description.strip(),
        cwd=(body.cwd.strip() if body.cwd and body.cwd.strip() else None),
        transport=body.transport,
        url=url,
        auth_type=body.auth_type,
        auth_token=(body.auth_token.strip() if body.auth_token else None),
        env_json=body.env_json,
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
    skills = []
    for r in rows:
        skills.append({
            "name": r["name"],
            "description": r["description"],
            "enabled": r.get("enabled", 1),
            "trigger_keywords": r.get("trigger_keywords", []),
            "category": r.get("category", "general"),
            "examples": r.get("examples", []),
        })
    return {"count": len(skills), "skills": skills}


@router.post("/skills")
async def upsert_skill(body: SkillUpsertRequest) -> Dict[str, Any]:
    name = body.name.strip()
    description = body.description.strip()
    if not name or not description:
        raise HTTPException(status_code=400, detail="name and description are required")
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(status_code=400, detail="invalid skill name")

    await upsert_skill_record(
        name=name,
        description=description,
        body=body.body.strip(),
        trigger_keywords=body.trigger_keywords,
        category=body.category,
        examples=body.examples,
        version=body.version,
    )
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


# ============ Skill 文件系统管理 API ============

@router.get("/skills/fs")
async def list_skills_fs() -> Dict[str, Any]:
    """获取所有 Skills 的详细信息（包括目录结构）"""
    skills = list_skills_as_dicts()
    return {"count": len(skills), "skills": skills}


@router.get("/skills/fs/{name}")
async def get_skill_fs(name: str) -> Dict[str, Any]:
    """获取单个 Skill 的完整信息"""
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    skill = get_skill_as_dict(target)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{target}' not found")

    return {"found": True, "skill": skill}


@router.post("/skills/fs")
async def create_skill_fs(body: SkillCreateRequest) -> Dict[str, Any]:
    """创建新的 Skill（包含完整目录结构）"""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if "/" in name or "\\" in name or name.startswith("."):
        raise HTTPException(status_code=400, detail="invalid skill name")

    success = create_skill(
        name=name,
        description=body.description.strip(),
        category=body.category,
        trigger_keywords=body.trigger_keywords,
        examples=body.examples,
    )

    if not success:
        raise HTTPException(status_code=400, detail="Failed to create skill")

    invalidate_config_cache()
    return {"ok": True, "name": name}


@router.post("/skills/fs/{name}/files")
async def update_skill_file(name: str, body: SkillUpdateFileRequest) -> Dict[str, Any]:
    """更新 Skill 中的文件"""
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    success = update_skill_file(target, body.file_path, body.content)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update file")

    return {"ok": True, "name": name, "file_path": body.file_path}


@router.get("/skills/fs/{name}/file-content")
async def read_skill_file_query(name: str, file_path: str = Query(..., min_length=1, description="相对 skill 目录的路径，如 scripts/a.py")) -> Dict[str, Any]:
    """读取 Skill 文件（query 传路径，避免 URL 路径中含 / 被网关拦截）。"""
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    content = read_skill_file_fs(target, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")

    return {"name": name, "file_path": file_path, "content": content}


@router.get("/skills/fs/{name}/files/{path:path}")
async def read_skill_file_path(name: str, path: str) -> Dict[str, Any]:
    """读取 Skill 中的文件内容（路径参数方式，含子目录时用 file-content 接口更稳）。"""
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    content = read_skill_file_fs(target, path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")

    return {"name": name, "file_path": path, "content": content}


@router.delete("/skills/fs/{name}")
async def delete_skill_fs(name: str) -> Dict[str, Any]:
    """删除 Skill（包含整个目录）"""
    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    success = delete_skill(target)
    if not success:
        raise HTTPException(status_code=404, detail=f"Skill '{target}' not found")

    invalidate_config_cache()
    return {"ok": True, "deleted": True}


# ============ MCP 工具信息 API ============

@router.get("/mcp/{name}/tools")
async def get_mcp_tools(name: str) -> Dict[str, Any]:
    """获取 MCP 服务的工具列表"""
    from app.services.mcp_service import get_mcp_server_by_name, list_mcp_tools

    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    mcp_config = await get_mcp_server_by_name(target)
    if not mcp_config:
        raise HTTPException(status_code=404, detail=f"MCP server '{target}' not found")

    try:
        tools = await list_mcp_tools(target)
        return {"name": target, "tools": tools}
    except Exception as e:
        return {"name": target, "tools": [], "error": str(e)}


@router.get("/mcp/{name}/resources")
async def get_mcp_resources(name: str) -> Dict[str, Any]:
    """获取 MCP 服务暴露的资源列表（需服务端实现 resources/list）。"""
    from app.services.mcp_service import get_mcp_server_by_name, list_mcp_resources

    target = name.strip()
    if not target:
        raise HTTPException(status_code=400, detail="name is required")

    mcp_config = await get_mcp_server_by_name(target)
    if not mcp_config:
        raise HTTPException(status_code=404, detail=f"MCP server '{target}' not found")

    resources, err = await list_mcp_resources(target)
    return {"name": target, "resources": resources, "error": err}
