from __future__ import annotations

from typing import Any, Dict

from app.capability.tools._workspace_paths import safe_relative_path
from app.capability.tool_base import BaseTool
from app.paths import workspace_root


class ReadWorkspaceFileTool(BaseTool):
    name = "read_workspace_file"
    display_name = "Read file"
    description = (
        "Read a UTF-8 text file under the workspace root. "
        "Path must be relative (e.g. 'backend/app/main.py')."
    )
    permission = "standard"
    category = "files"
    tags = ("read", "fs")

    parameters_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative file path under workspace root.",
            },
        },
        "required": ["path"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        rel = str(params.get("path") or "").strip()
        if not rel:
            return "Error: path required"
        try:
            p = safe_relative_path(rel)
        except Exception:
            return "Error: path escapes workspace or is invalid"
        if not p.is_file():
            return f"Error: not a file: {rel}"
        try:
            return p.read_text(encoding="utf-8")
        except OSError as e:
            return f"Error reading file: {e}"
