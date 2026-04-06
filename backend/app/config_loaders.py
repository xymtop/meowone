"""Load Agent Skills (SKILL.md) and context from `.meowone/` (repo root)."""
from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml

from app.config import MEOWONE_CONFIG_DIR, MAX_CONTEXT_CHARS, MAX_SKILLS_CHARS

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _config_root() -> Path:
    root = Path(MEOWONE_CONFIG_DIR)
    if not root.is_absolute():
        root = _repo_root() / root
    return root


def _truncate(label: str, text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    logger.warning("%s truncated: %s -> %s chars", label, len(text), max_chars)
    return text[: max_chars - 80] + "\n\n… [truncated to fit context budget]\n"


def _parse_skill_md(raw: str) -> Tuple[Dict[str, Any], str]:
    """
    Agent Skills open standard: directory with SKILL.md, YAML frontmatter + body.
    See https://agentskills.io / Claude Code skills.
    """
    text = raw.lstrip("\ufeff")
    if not text.startswith("---"):
        return {}, text.strip()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.DOTALL)
    if not m:
        return {}, text.strip()
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except Exception:
        fm = {}
    body = (m.group(2) or "").strip()
    return (fm if isinstance(fm, dict) else {}), body


@lru_cache(maxsize=1)
def load_agent_skills_prompt() -> str:
    """
    Progressive disclosure: inject metadata + bounded body for each skill.
    Expected layout: `.meowone/skills/<skill-id>/SKILL.md`
    """
    skills_root = _config_root() / "skills"
    if not skills_root.is_dir():
        return ""
    chunks: List[str] = []
    for skill_dir in sorted(skills_root.iterdir()):
        if not skill_dir.is_dir():
            continue
        sk_file = skill_dir / "SKILL.md"
        if not sk_file.is_file():
            continue
        try:
            raw = sk_file.read_text(encoding="utf-8")
        except OSError as e:
            logger.warning("skip skill %s: %s", sk_file, e)
            continue
        fm, body = _parse_skill_md(raw)
        sid = str(fm.get("name") or skill_dir.name)
        desc = str(fm.get("description") or "").strip()
        header = f"### Skill `{sid}`\n"
        if desc:
            header += f"**Description:** {desc}\n\n"
        if body:
            chunks.append(header + body)
        else:
            chunks.append(header + "_(empty SKILL.md body)_")
    if not chunks:
        return ""
    merged = "\n\n---\n\n".join(chunks)
    return _truncate("skills", merged, MAX_SKILLS_CHARS)


@lru_cache(maxsize=1)
def load_context_markdown() -> str:
    ctx_dir = _config_root() / "context"
    if not ctx_dir.is_dir():
        return ""
    parts: List[str] = []
    for path in sorted(ctx_dir.rglob("*.md")):
        try:
            rel = path.relative_to(ctx_dir)
            parts.append(f"### {rel}\n\n{path.read_text(encoding='utf-8')}")
        except OSError as e:
            logger.warning("skip context %s: %s", path, e)
    if not parts:
        return ""
    body = "\n\n---\n\n".join(parts)
    return _truncate("context", body, MAX_CONTEXT_CHARS)


@lru_cache(maxsize=1)
def load_mcp_servers_text() -> str:
    path = _config_root() / "mcp.yaml"
    if not path.is_file():
        return ""
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except Exception as e:
        logger.warning("mcp.yaml invalid: %s", e)
        return ""
    servers = raw.get("servers") or []
    if not isinstance(servers, list) or not servers:
        return ""
    lines: List[str] = []
    for s in servers:
        if not isinstance(s, dict):
            continue
        name = s.get("name", "?")
        desc = s.get("description", "")
        cmd = s.get("command", "")
        lines.append(f"- **{name}**: {desc}")
        if cmd:
            lines.append(f"  - command: `{cmd}`")
    if not lines:
        return ""
    return (
        "### MCP servers (from .meowone/mcp.yaml)\n"
        "Use tools **list_mcp_tools** / **call_mcp_tool** to interact.\n\n"
        + "\n".join(lines)
    )


def invalidate_config_cache() -> None:
    load_agent_skills_prompt.cache_clear()
    load_context_markdown.cache_clear()
    load_mcp_servers_text.cache_clear()


def build_extra_system_prompt() -> str:
    chunks: List[str] = []
    sk = load_agent_skills_prompt()
    if sk:
        chunks.append("## Agent skills (SKILL.md under .meowone/skills/)\n\n" + sk)
    ctx = load_context_markdown()
    if ctx:
        chunks.append("## Project context (.meowone/context/)\n\n" + ctx)
    mcp = load_mcp_servers_text()
    if mcp:
        chunks.append("## MCP\n\n" + mcp)
    return "\n\n".join(chunks) if chunks else ""
