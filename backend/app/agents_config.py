"""从 YAML 加载远程 A2A 工具配置（优先 `.meowone/agents.yaml`，回退仓库根 `agents.yaml`）。"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, List

import yaml

logger = logging.getLogger(__name__)


@dataclass
class RemoteAgentEntry:
    tool_name: str
    description: str
    base_url: str
    enabled: bool = True


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def resolve_agents_yaml_path() -> Path | None:
    env = os.getenv("AGENTS_CONFIG_PATH", "").strip()
    root = _repo_root()
    if env:
        p = Path(env)
        p = p if p.is_absolute() else root / p
        return p if p.is_file() else None
    for candidate in (root / ".meowone" / "agents.yaml", root / "agents.yaml"):
        if candidate.is_file():
            return candidate
    return None


def load_remote_agents() -> List[RemoteAgentEntry]:
    path = resolve_agents_yaml_path()
    if path is None:
        logger.warning("未找到 agents 配置（尝试 .meowone/agents.yaml 与 agents.yaml）")
        return []
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    agents: List[RemoteAgentEntry] = []
    for item in raw.get("agents") or []:
        if not isinstance(item, dict):
            continue
        if not item.get("enabled", True):
            continue
        name = item.get("tool_name") or item.get("name")
        url = item.get("base_url")
        desc = item.get("description") or ""
        if not name or not url:
            continue
        agents.append(
            RemoteAgentEntry(
                tool_name=str(name),
                description=str(desc),
                base_url=str(url).rstrip("/"),
                enabled=True,
            )
        )
    return agents


def load_raw_config() -> dict[str, Any]:
    path = resolve_agents_yaml_path()
    if path is None:
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
