from __future__ import annotations

from typing import Any, Dict, List

from app.capability.tools._workspace_paths import safe_relative_path
from app.capability.tool_base import BaseTool
from app.paths import workspace_root


class ListWorkspaceDirTool(BaseTool):
    name = "list_workspace_dir"
    display_name = "List directory"
    description = (
        "List files and subdirectories under a path relative to the workspace root. "
        "Use '.' for the workspace root."
    )
    permission = "standard"
    category = "files"
    tags = ("list", "fs")

    parameters_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative directory path (use '.' for root).",
            },
        },
        "required": ["path"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        rel = str(params.get("path") or "").strip() or "."
        try:
            p = safe_relative_path(rel)
        except Exception:
            return "Error: path escapes workspace or is invalid"
        root = workspace_root().resolve()
        if not p.exists():
            return f"Error: not found: {rel}"
        if p.is_file():
            return str(p.relative_to(root))
        lines: List[str] = []
        for child in sorted(p.iterdir()):
            kind = "dir" if child.is_dir() else "file"
            lines.append(f"[{kind}] {child.name}")
        return "\n".join(lines) if lines else "(empty directory)"
