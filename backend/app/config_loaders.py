"""Load Agent Skills (SKILL.md) and context from `.meowone/` (repo root)."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import yaml

from app.config import MEOWONE_CONFIG_DIR, MAX_CONTEXT_CHARS, MAX_SKILLS_CHARS
from app.mcp.mcp_config import load_mcp_servers

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentSkillInfo:
    """One skill under `.meowone/skills/<dirname>/SKILL.md` (Agent Skills open standard)."""

    dirname: str
    name: str
    description: str
    skill_md_path: str


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
def scan_agent_skills() -> Tuple[AgentSkillInfo, ...]:
    """
    Discover skills: `.meowone/skills/<skill-dir>/SKILL.md` with YAML frontmatter.
    See https://agentskills.io/specification — `name` should match the parent directory name.
    """
    skills_root = _config_root() / "skills"
    out: List[AgentSkillInfo] = []
    if not skills_root.is_dir():
        return tuple(out)
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
        fm, _body = _parse_skill_md(raw)
        dirname = skill_dir.name
        sid = str(fm.get("name") or dirname).strip()
        desc = str(fm.get("description") or "").strip()
        if not desc:
            logger.warning(
                "skill %s: missing `description` in frontmatter (spec requires it)",
                sk_file,
            )
        if sid != dirname:
            logger.warning(
                "skill %s: frontmatter name %r should match directory %r per Agent Skills spec",
                sk_file,
                sid,
                dirname,
            )
        out.append(
            AgentSkillInfo(
                dirname=dirname,
                name=sid,
                description=desc,
                skill_md_path=str(sk_file.resolve()),
            )
        )
    return tuple(out)


def resolve_agent_skill(query: str) -> Optional[AgentSkillInfo]:
    """Match by directory name or frontmatter `name` (exact, case-sensitive)."""
    q = query.strip()
    if not q:
        return None
    for info in scan_agent_skills():
        if q == info.dirname or q == info.name:
            return info
    return None


def format_skill_activation_for_model(info: AgentSkillInfo) -> str:
    """
    Full SKILL.md content for tool result (activation), so the body enters the loop as tool output.
    """
    path = Path(info.skill_md_path)
    raw = path.read_text(encoding="utf-8")
    fm, body = _parse_skill_md(raw)
    lines = [
        f"# Agent skill activated: `{info.name}`",
        "",
        "Follow these instructions for the current task. File references are relative to the skill directory:",
        f"`{_config_root() / 'skills' / info.dirname}`",
        "",
        "---",
        "",
    ]
    if body:
        lines.append(body.strip())
    else:
        lines.append("_(empty SKILL.md body)_")
    merged = "\n".join(lines)
    return _truncate("skill_activation", merged, MAX_SKILLS_CHARS)


@lru_cache(maxsize=1)
def load_agent_skills_metadata_prompt() -> str:
    """
    Progressive disclosure (step 1): only name + description for each skill.
    Full SKILL.md body is loaded via the `load_agent_skill` tool when relevant.
    https://agentskills.io/specification#progressive-disclosure
    """
    skills = scan_agent_skills()
    if not skills:
        return ""
    lines: List[str] = [
        "### Agent Skills inventory (metadata only)",
        "",
        "These entries follow the [Agent Skills](https://agentskills.io/specification) layout under `.meowone/skills/<name>/SKILL.md`. "
        "**Only** `name` and `description` are preloaded here. When a user task matches a skill, call **`load_agent_skill`** with that `name` "
        "to load the full Markdown body into the conversation. Optional files (`references/`, `scripts/`, `assets/`) may be read with "
        "**`read_workspace_file`** using paths like `.meowone/skills/<name>/references/REFERENCE.md`.",
        "",
    ]
    for s in skills:
        desc = s.description or "_(no description)_"
        lines.append(f"- **`{s.name}`** — {desc}")
    text = "\n".join(lines)
    return _truncate("skills_metadata", text, MAX_SKILLS_CHARS)


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
    """
    与 `mcp_config.load_mcp_servers()` 同源，保证系统提示里出现的 MCP 列表与工具层一致。
    无配置时仍注入一段说明，避免模型「看不到 MCP」。
    """
    servers = load_mcp_servers()
    header = (
        "### MCP servers (this workspace)\n\n"
        "Use **list_mcp_tools** / **call_mcp_tool** with the server **`name`** shown below.\n\n"
    )
    if not servers:
        return (
            header
            + "**No MCP servers are configured.** Edit `.meowone/mcp.json` and restart the backend. "
            "Supported shapes:\n"
            "- **`servers`**: array of `{ \"name\", \"command\", \"description?\", \"cwd?\", \"args?\" }`\n"
            "- **`mcpServers`**: Cursor-style map of server name → `{ \"command\", \"args?\", ... }`\n"
        )
    lines: List[str] = []
    for s in servers:
        desc = (s.description or "").strip() or "_(no description)_"
        lines.append(f"- **{s.name}** — {desc}")
        lines.append(f"  - command: `{s.command}`")
        if s.cwd:
            lines.append(f"  - cwd: `{s.cwd}`")
    return header + "\n".join(lines)


def invalidate_config_cache() -> None:
    scan_agent_skills.cache_clear()
    load_agent_skills_metadata_prompt.cache_clear()
    load_context_markdown.cache_clear()
    load_mcp_servers_text.cache_clear()


def build_extra_system_prompt() -> str:
    chunks: List[str] = []
    sk = load_agent_skills_metadata_prompt()
    if sk:
        chunks.append(sk)
    ctx = load_context_markdown()
    if ctx:
        chunks.append("## Project context (.meowone/context/)\n\n" + ctx)
    mcp = load_mcp_servers_text()
    if mcp:
        chunks.append("## MCP\n\n" + mcp)
    return "\n\n".join(chunks) if chunks else ""
