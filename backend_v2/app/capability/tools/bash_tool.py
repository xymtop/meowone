"""Run shell commands within the workspace sandbox (opt-in)."""
from __future__ import annotations

import asyncio
import re
import shlex
from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.config import MEOWONE_ALLOW_BASH, TOOL_TIMEOUT_SECONDS
from app.paths import workspace_root


_BLOCK_PATTERNS = (
    r";\s*rm\s",
    r"\brm\s+-rf\s+/",
    r">\s*/dev/",
    r"\$\(",
    r"`[^`]+`",
    r"\|\s*bash",
)


class BashTool(BaseTool):
    name = "run_terminal_cmd"
    display_name = "Terminal (sandboxed)"
    description = (
        "Run a **single** shell command inside the workspace root. "
        "Requires MEOWONE_ALLOW_BASH=1 on the server. "
        "Avoid interactive commands; use non-interactive flags."
    )
    permission = "sensitive"
    category = "system"
    tags = ("bash", "shell")

    parameters_schema = {
        "type": "object",
        "properties": {
            "command": {
                "type": "string",
                "description": "Shell command (no newlines preferred).",
            },
            "cwd": {
                "type": "string",
                "description": "Optional subdirectory under workspace (e.g. 'backend').",
            },
        },
        "required": ["command"],
    }

    async def execute(self, params: Dict[str, Any]) -> str:
        if not MEOWONE_ALLOW_BASH:
            return (
                "Error: bash tool disabled. Set environment variable MEOWONE_ALLOW_BASH=1 "
                "to enable (server admin only)."
            )
        cmd = str(params.get("command") or "").strip()
        if not cmd or "\n" in cmd:
            return "Error: empty or multi-line command not allowed"
        for pat in _BLOCK_PATTERNS:
            if re.search(pat, cmd, re.IGNORECASE):
                return f"Error: command blocked by safety policy (pattern: {pat})"

        root = workspace_root()
        cwd = root
        rel = str(params.get("cwd") or "").strip()
        if rel:
            candidate = (root / rel).resolve()
            try:
                candidate.relative_to(root)
            except ValueError:
                return "Error: cwd escapes workspace"
            cwd = candidate
            if not cwd.is_dir():
                return f"Error: cwd is not a directory: {rel}"

        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                cwd=str(cwd),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except Exception as e:
            return f"Error: failed to start process: {e}"

        try:
            out_b, err_b = await asyncio.wait_for(
                proc.communicate(),
                timeout=float(TOOL_TIMEOUT_SECONDS),
            )
        except asyncio.TimeoutError:
            proc.kill()
            return f"Error: command timed out after {TOOL_TIMEOUT_SECONDS}s"

        out = out_b.decode("utf-8", errors="replace")
        err = err_b.decode("utf-8", errors="replace")
        parts = []
        if out:
            parts.append(out.rstrip())
        if err:
            parts.append("[stderr]\n" + err.rstrip())
        if proc.returncode != 0:
            parts.append(f"[exit code {proc.returncode}]")
        return "\n".join(parts) if parts else "(no output)"
