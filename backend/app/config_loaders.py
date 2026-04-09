"""
配置加载模块
从 `.meowone/` 目录加载 Agent Skills 和上下文配置

主要功能：
1. 扫描并解析 `.meowone/skills/` 目录下的 Agent Skills
2. 加载 `.meowone/context/` 目录下的上下文文档
3. 加载 MCP 服务器配置
4. 加载调度器和渠道配置
"""

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
from app.services.skill_service import list_skills_sync

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AgentSkillInfo:
    """单个 Agent Skill 的元数据信息
    
    Agent Skills 遵循开放标准，存储在 `.meowone/skills/<dirname>/SKILL.md`
    """
    dirname: str       # 技能目录名
    name: str          # 技能名称（来自 YAML frontmatter 或目录名）
    description: str   # 技能描述
    skill_md_path: str # SKILL.md 文件的绝对路径


def _repo_root() -> Path:
    """获取仓库根目录路径"""
    return Path(__file__).resolve().parents[2]


def _config_root() -> Path:
    """
    获取配置根目录路径
    
    如果 MEOWONE_CONFIG_DIR 是相对路径，则相对于仓库根目录
    """
    root = Path(MEOWONE_CONFIG_DIR)
    if not root.is_absolute():
        root = _repo_root() / root
    return root


def _truncate(label: str, text: str, max_chars: int) -> str:
    """
    截断过长的文本以符合上下文预算限制
    
    Args:
        label: 用于日志的标签
        text: 要截断的文本
        max_chars: 最大字符数
    
    Returns:
        截断后的文本，如果原文本未超过限制则返回原文本
    """
    if len(text) <= max_chars:
        return text
    logger.warning("%s 被截断: %s -> %s 字符", label, len(text), max_chars)
    return text[: max_chars - 80] + "\n\n… [已截断以符合上下文预算]\n"


def _parse_skill_md(raw: str) -> Tuple[Dict[str, Any], str]:
    """
    解析 SKILL.md 文件
    
    Agent Skills 开放标准使用 YAML frontmatter 格式：
    ---
    name: 技能名称
    description: 技能描述
    ---
    技能正文内容
    
    Returns:
        (元数据字典, 正文内容)
    """
    text = raw.lstrip("\ufeff")  # 移除 BOM 字符
    if not text.startswith("---"):
        return {}, text.strip()
    
    # 匹配 YAML frontmatter
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
    扫描并发现所有 Agent Skills
    
    扫描 `.meowone/skills/<skill-dir>/SKILL.md` 文件，
    解析其中的 YAML frontmatter 元数据。
    
    Returns:
        所有发现的技能元数据组成的元组
    """
    # 优先从数据库获取技能列表
    db_skills = list_skills_sync(enabled_only=True)
    if db_skills:
        root = _config_root() / "skills"
        out: List[AgentSkillInfo] = []
        for item in db_skills:
            name = str(item.get("name") or "").strip()
            if not name:
                continue
            desc = str(item.get("description") or "").strip()
            out.append(
                AgentSkillInfo(
                    dirname=name,
                    name=name,
                    description=desc,
                    skill_md_path=str((root / name / "SKILL.md").resolve()),
                )
            )
        return tuple(out)
    
    # 如果数据库为空，从文件系统扫描
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
            logger.warning("跳过技能 %s: %s", sk_file, e)
            continue
        
        fm, _body = _parse_skill_md(raw)
        dirname = skill_dir.name
        sid = str(fm.get("name") or dirname).strip()
        desc = str(fm.get("description") or "").strip()
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
    """
    根据名称查找 Agent Skill
    
    Args:
        query: 技能名称（精确匹配）
    
    Returns:
        匹配的技能信息，未找到则返回 None
    """
    q = query.strip()
    if not q:
        return None
    for info in scan_agent_skills():
        if q == info.dirname or q == info.name:
            return info
    return None


def format_skill_activation_for_model(info: AgentSkillInfo) -> str:
    """
    格式化技能激活信息，用于输入给模型
    
    完整的 SKILL.md 内容会作为工具结果输出给模型，
    使模型能够按照技能的指令执行任务。
    """
    body = ""
    
    # 优先从数据库获取技能正文
    db_skills = list_skills_sync(enabled_only=True)
    for item in db_skills:
        if str(item.get("name") or "").strip() == info.name:
            body = str(item.get("body") or "").strip()
            break
    
    # 如果数据库中没有，从文件读取
    if not body:
        path = Path(info.skill_md_path)
        raw = path.read_text(encoding="utf-8")
        _fm, body = _parse_skill_md(raw)
    
    # 构建格式化的技能激活文本
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
    加载 Agent Skills 元数据提示
    
    使用渐进式披露策略：
    - 第一次只加载技能的名称和描述
    - 当任务匹配某个技能时，再通过 load_agent_skill 工具加载完整的 SKILL.md 正文
    """
    skills = scan_agent_skills()
    if not skills:
        return ""
    
    lines: List[str] = [
        "### Agent Skills 清单（仅元数据）",
        "",
        "这些技能遵循 Agent Skills 布局规范，存储在 `.meowone/skills/<name>/SKILL.md`。",
        "**此处仅**预加载 `name` 和 `description`。当用户任务匹配某个技能时，调用 **`load_agent_skill`** 工具",
        "加载完整的 Markdown 正文到对话中。可选文件（`references/`、`scripts/`、`assets/`）可使用",
        "**`read_workspace_file`** 读取，路径格式如 `.meowone/skills/<name>/references/REFERENCE.md`。",
        "",
    ]
    for s in skills:
        desc = s.description or "_(无描述)_"
        lines.append(f"- **`{s.name}`** — {desc}")
    
    text = "\n".join(lines)
    return _truncate("skills_metadata", text, MAX_SKILLS_CHARS)


@lru_cache(maxsize=1)
def load_context_markdown() -> str:
    """
    加载 `.meowone/context/` 目录下的所有 Markdown 文档
    
    这些文档会被拼接到系统提示中，为智能体提供项目相关的背景知识。
    """
    ctx_dir = _config_root() / "context"
    if not ctx_dir.is_dir():
        return ""
    
    parts: List[str] = []
    for path in sorted(ctx_dir.rglob("*.md")):
        try:
            rel = path.relative_to(ctx_dir)
            parts.append(f"### {rel}\n\n{path.read_text(encoding='utf-8')}")
        except OSError as e:
            logger.warning("跳过上下文 %s: %s", path, e)
    
    if not parts:
        return ""
    
    body = "\n\n---\n\n".join(parts)
    return _truncate("context", body, MAX_CONTEXT_CHARS)


@lru_cache(maxsize=1)
def load_mcp_servers_text() -> str:
    """
    加载 MCP 服务器配置文本
    
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
        desc = (s.description or "").strip() or "_(无描述)_"
        lines.append(f"- **{s.name}** — {desc}")
        lines.append(f"  - command: `{s.command}`")
        if s.cwd:
            lines.append(f"  - cwd: `{s.cwd}`")
    return header + "\n".join(lines)


def invalidate_config_cache() -> None:
    """
    清除所有配置缓存
    
    在配置文件更新后调用，确保下次访问时重新加载最新配置
    """
    scan_agent_skills.cache_clear()
    load_agent_skills_metadata_prompt.cache_clear()
    load_context_markdown.cache_clear()
    load_mcp_servers_text.cache_clear()
    load_scheduler_config.cache_clear()
    load_channels_config.cache_clear()


def build_extra_system_prompt() -> str:
    """
    构建额外的系统提示文本
    
    将 Agent Skills 元数据、上下文文档、MCP 服务器配置拼接成完整的额外系统提示
    """
    chunks: List[str] = []
    
    # 添加 Agent Skills 元数据
    sk = load_agent_skills_metadata_prompt()
    if sk:
        chunks.append(sk)
    
    # 添加上下文文档
    ctx = load_context_markdown()
    if ctx:
        chunks.append("## Project context (.meowone/context/)\n\n" + ctx)
    
    # 添加 MCP 服务器信息
    mcp = load_mcp_servers_text()
    if mcp:
        chunks.append("## MCP\n\n" + mcp)
    
    return "\n\n".join(chunks) if chunks else ""


@lru_cache(maxsize=1)
def load_scheduler_config() -> Dict[str, Any]:
    """
    加载调度器配置
    
    从 `.meowone/scheduler.yaml` 文件加载可选的调度器路由配置
    """
    p = _config_root() / "scheduler.yaml"
    if not p.is_file():
        return {}
    try:
        raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except Exception as e:
        logger.warning("scheduler.yaml 格式无效: %s", e)
        return {}
    return raw if isinstance(raw, dict) else {}


@lru_cache(maxsize=1)
def load_channels_config() -> Dict[str, Dict[str, List[str]]]:
    """
    加载渠道能力过滤器配置
    
    从 `.meowone/channels.yaml` 文件加载各渠道的工具权限配置
    
    Returns:
        字典结构：{渠道ID: {"allow_tools": [], "deny_tools": []}}
    """
    p = _config_root() / "channels.yaml"
    if not p.is_file():
        return {}
    try:
        raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    except Exception as e:
        logger.warning("channels.yaml 格式无效: %s", e)
        return {}
    if not isinstance(raw, dict):
        return {}
    
    channels = raw.get("channels")
    if not isinstance(channels, dict):
        return {}

    out: Dict[str, Dict[str, List[str]]] = {}
    for channel_id, cfg in channels.items():
        if not isinstance(channel_id, str) or not isinstance(cfg, dict):
            continue
        allow = cfg.get("allow_tools") or []
        deny = cfg.get("deny_tools") or []
        out[channel_id] = {
            "allow_tools": [str(x) for x in allow if isinstance(x, str)],
            "deny_tools": [str(x) for x in deny if isinstance(x, str)],
        }
    return out
