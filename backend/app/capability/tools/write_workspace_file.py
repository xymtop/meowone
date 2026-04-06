from __future__ import annotations

from typing import Any, Dict

from app.capability.tools._workspace_paths import safe_relative_path
from app.capability.tool_base import BaseTool


class WriteWorkspaceFileTool(BaseTool):
    name = "write_workspace_file"
    display_name = "Write file"
    description = (
        "Create or overwrite a UTF-8 text file under the workspace root. "
        "Parent directories are created as needed."
    )
    permission = "sensitive"
    category = "files"
    tags = ("write", "fs")

    parameters_schema = {
        "type": "object",
        "properties": {
            "path": {
                "type": "string",
                "description": "Relative file path under workspace root.",
            },
            "content": {
                "type": "string",
                "description": "Full file contents (UTF-8).",
            },
        },
        "required": ["path", "content"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        rel = str(params.get("path") or "").strip()
        if not rel:
            return "Error: path required"
        content = str(params.get("content") if params.get("content") is not None else "")
        try:
            p = safe_relative_path(rel)
        except Exception:
            return "Error: path escapes workspace or is invalid"
        try:
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
        except OSError as e:
            return f"Error writing file: {e}"
        return f"Wrote {len(content)} bytes to {rel}"
