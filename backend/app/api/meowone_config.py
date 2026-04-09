"""Read-only view of `.meowone/` config files for the settings UI."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

from app.config import MEOWONE_CONFIG_DIR

"""
# MeowOne 配置 API

只读读取 `.meowone/` 配置目录的文件内容。

## 配置目录结构
通常位于项目根目录的 `.meowone/` 目录下，包含：
- 系统配置文件
- 提示词模板
- 智能体配置
- 技能定义等

## 支持的文件格式
- `.md` - Markdown 文档
- `.json` - JSON 配置
- `.yaml` / `.yml` - YAML 配置
- `.txt` - 文本文件

## 使用场景
前端设置页面需要展示和编辑配置文件时使用此接口获取原始内容。
"""
router = APIRouter(prefix="/api/meowone", tags=["MeowOne配置"])

MAX_FILE_BYTES = 256_000


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _config_root() -> Path:
    p = Path(MEOWONE_CONFIG_DIR)
    if not p.is_absolute():
        p = _repo_root() / p
    return p


@router.get("/config")
async def list_meowone_config():
    root = _config_root()
    if not root.is_dir():
        return {"root": str(root), "files": []}
    files_out: list[dict[str, str]] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        if path.suffix.lower() not in {".md", ".json", ".yaml", ".yml", ".txt"}:
            continue
        try:
            raw = path.read_bytes()
        except OSError:
            continue
        if len(raw) > MAX_FILE_BYTES:
            text = raw[:MAX_FILE_BYTES].decode("utf-8", errors="replace") + "\n\n… [truncated]"
        else:
            text = raw.decode("utf-8", errors="replace")
        files_out.append({"path": str(rel).replace("\\", "/"), "content": text})
    return {"root": str(root), "files": files_out}
