"""Skill 文件系统管理 - 管理 .meowone/skills/ 目录结构"""
from __future__ import annotations

import json
import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.config import MEOWONE_CONFIG_DIR

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    """获取项目根目录（backend 的上一级）"""
    # __file__ 是 /path/to/backend/app/services/skill_fs.py
    # 需要找 /path/to/meowone/
    p = Path(__file__).resolve()

    # 容器内检测：检查 /app/.meowone 或 /app 下是否有 .meowone
    if str(p).startswith("/app"):
        app_meowone = Path("/app/.meowone")
        if app_meowone.exists():
            return Path("/app")
        # 如果 /app 下没有 .meowone，向下找（可能安装在 /app/meowone/）
        if (Path("/app/meowone/.meowone").exists()):
            return Path("/app/meowone")
        return Path("/app")

    # 本地开发环境：向上查找 .meowone 目录
    max_depth = min(10, len(p.parents) - 1)
    for i in range(max_depth):
        if (p.parents[i] / ".meowone").exists():
            return p.parents[i]

    # fallback: 假设结构是 xxx/meowone/backend/...
    if len(p.parents) >= 4:
        return p.parents[3]
    return p.parent


def _config_root() -> Path:
    """获取 .meowone 配置目录的绝对路径"""
    root = Path(MEOWONE_CONFIG_DIR)
    if not root.is_absolute():
        root = _repo_root() / root
    return root


def _skills_root() -> Path:
    return _config_root() / "skills"


@dataclass
class SkillFile:
    """Skill 中的单个文件"""
    path: str  # 相对于 skill 目录的路径
    name: str
    size: int
    is_directory: bool
    file_type: str  # md, py, sh, json, txt, asset, etc.


@dataclass
class SkillInfo:
    """完整的 Skill 信息"""
    name: str
    description: str
    root_path: Path
    # YAML frontmatter 字段
    trigger_keywords: List[str] = field(default_factory=list)
    category: str = "general"
    version: str = "1.0.0"
    examples: List[str] = field(default_factory=list)
    # 目录结构
    files: List[SkillFile] = field(default_factory=list)
    # SKILL.md 内容
    body: str = ""
    # 元数据
    enabled: bool = True
    source: str = "file"


def parse_skill_md(content: str, skill_name: str) -> Dict[str, Any]:
    """解析 SKILL.md 内容，提取 YAML frontmatter 和正文"""
    text = content.lstrip("\ufeff")
    if not text.startswith("---"):
        return {
            "name": skill_name,
            "description": "",
            "body": text.strip(),
            "trigger_keywords": [],
            "category": "general",
            "version": "1.0.0",
            "examples": [],
        }

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {
            "name": skill_name,
            "description": "",
            "body": text.strip(),
            "trigger_keywords": [],
            "category": "general",
            "version": "1.0.0",
            "examples": [],
        }

    fm_text = parts[1]
    body = parts[2].strip()

    result: Dict[str, Any] = {
        "name": skill_name,
        "description": "",
        "body": body,
        "trigger_keywords": [],
        "category": "general",
        "version": "1.0.0",
        "examples": [],
    }

    for line in fm_text.splitlines():
        line = line.strip()
        if line.startswith("name:"):
            result["name"] = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif line.startswith("description:"):
            desc = line.split(":", 1)[1].strip()
            if desc.startswith(">"):
                # 处理 >- 格式的多行描述
                result["description"] = desc.lstrip(">-").strip()
            else:
                result["description"] = desc
        elif line.startswith("trigger_keywords:"):
            kw_str = line.split(":", 1)[1].strip()
            if kw_str.startswith("["):
                try:
                    result["trigger_keywords"] = json.loads(kw_str)
                except json.JSONDecodeError:
                    result["trigger_keywords"] = [k.strip() for k in kw_str.strip("[]").split(",") if k.strip()]
            else:
                result["trigger_keywords"] = [k.strip() for k in kw_str.split(",") if k.strip()]
        elif line.startswith("category:"):
            result["category"] = line.split(":", 1)[1].strip()
        elif line.startswith("version:"):
            result["version"] = line.split(":", 1)[1].strip().strip('"').strip("'")
        elif line.startswith("examples:"):
            ex_str = line.split(":", 1)[1].strip()
            if ex_str.startswith("["):
                try:
                    result["examples"] = json.loads(ex_str)
                except json.JSONDecodeError:
                    result["examples"] = []
            else:
                result["examples"] = [e.strip() for e in ex_str.strip("[]").split(",") if e.strip()]

    return result


def get_file_type(filename: str) -> str:
    """根据文件扩展名获取文件类型"""
    ext = Path(filename).suffix.lower()
    type_map = {
        ".md": "md",
        ".py": "py",
        ".sh": "sh",
        ".bash": "sh",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
        ".txt": "txt",
        ".csv": "csv",
        ".png": "asset",
        ".jpg": "asset",
        ".jpeg": "asset",
        ".gif": "asset",
        ".svg": "asset",
        ".pdf": "asset",
    }
    return type_map.get(ext, "other")


def scan_skill_directory(skill_path: Path, skill_name: str) -> List[SkillFile]:
    """扫描 skill 目录，返回文件列表"""
    files = []
    if not skill_path.is_dir():
        return files

    for item in sorted(skill_path.rglob("*")):
        rel_path = item.relative_to(skill_path)
        stat = item.stat()

        files.append(SkillFile(
            path=rel_path.as_posix(),
            name=item.name,
            size=stat.st_size if item.is_file() else 0,
            is_directory=item.is_dir(),
            file_type=get_file_type(item.name) if item.is_file() else "folder",
        ))

    return files


def load_skill(skill_name: str) -> Optional[SkillInfo]:
    """加载完整的 Skill 信息"""
    skill_root = _skills_root() / skill_name
    skill_md = skill_root / "SKILL.md"

    if not skill_md.is_file():
        return None

    try:
        content = skill_md.read_text(encoding="utf-8")
        parsed = parse_skill_md(content, skill_name)

        files = scan_skill_directory(skill_root, skill_name)

        return SkillInfo(
            name=parsed["name"],
            description=parsed["description"],
            root_path=skill_root,
            trigger_keywords=parsed.get("trigger_keywords", []),
            category=parsed.get("category", "general"),
            version=parsed.get("version", "1.0.0"),
            examples=parsed.get("examples", []),
            files=files,
            body=parsed.get("body", ""),
            enabled=True,
            source="file",
        )
    except Exception as e:
        logger.error("Failed to load skill %s: %s", skill_name, e)
        return None


def list_skills_from_files() -> List[SkillInfo]:
    """从文件系统列出所有 Skills"""
    root = _skills_root()
    if not root.is_dir():
        return []

    skills = []
    for skill_dir in sorted(root.iterdir()):
        if not skill_dir.is_dir():
            continue

        skill_md = skill_dir / "SKILL.md"
        if not skill_md.is_file():
            continue

        skill_name = skill_dir.name
        skill_info = load_skill(skill_name)
        if skill_info:
            skills.append(skill_info)

    return skills


def create_skill(
    name: str,
    description: str = "",
    category: str = "general",
    trigger_keywords: List[str] = None,
    examples: List[str] = None,
) -> bool:
    """创建新的 Skill 目录结构"""
    if trigger_keywords is None:
        trigger_keywords = []
    if examples is None:
        examples = []

    skill_root = _skills_root() / name
    if skill_root.exists():
        logger.warning("Skill %s already exists", name)
        return False

    try:
        # 创建目录结构
        skill_root.mkdir(parents=True, exist_ok=False)
        (skill_root / "scripts").mkdir(exist_ok=True)
        (skill_root / "references").mkdir(exist_ok=True)
        (skill_root / "assets").mkdir(exist_ok=True)

        # 创建 SKILL.md
        skill_md_content = f"""---
name: {name}
description: >-
  {description}
trigger_keywords: {json.dumps(trigger_keywords, ensure_ascii=False)}
category: {category}
version: "1.0.0"
examples: {json.dumps(examples, ensure_ascii=False)}
---

# {name}

## 概述

{description}

## 使用方法

1. 理解用户需求
2. 必要时使用 scripts/ 中的脚本
3. 参考 references/ 中的文档

## 最佳实践

- 遵循标准流程
- 及时反馈进度
- 确保结果质量
"""

        (skill_root / "SKILL.md").write_text(skill_md_content, encoding="utf-8")

        # 创建示例脚本
        example_script = '''#!/usr/bin/env python3
"""示例脚本 - 根据需要修改"""
import sys

def main():
    print("Hello from example script!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
'''
        (skill_root / "scripts" / "example.py").write_text(example_script, encoding="utf-8")

        # 创建示例参考文档
        ref_content = '''# 参考文档

在此添加相关的参考资料、API 文档、最佳实践等内容。

## 常用资源

- 官方文档链接
- API 参考
- 常见问题解答
'''
        (skill_root / "references" / "guide.md").write_text(ref_content, encoding="utf-8")

        logger.info("Created skill: %s", name)
        return True

    except Exception as e:
        logger.error("Failed to create skill %s: %s", name, e)
        # 清理已创建的目录
        if skill_root.exists():
            shutil.rmtree(skill_root)
        return False


def delete_skill(name: str) -> bool:
    """删除 Skill 目录"""
    skill_root = _skills_root() / name
    if not skill_root.exists():
        return False

    try:
        shutil.rmtree(skill_root)
        logger.info("Deleted skill: %s", name)
        return True
    except Exception as e:
        logger.error("Failed to delete skill %s: %s", name, e)
        return False


def _resolve_safe_skill_file(skill_name: str, file_path: str) -> Optional[Path]:
    """将相对路径解析为 skill 目录下的真实文件，禁止跳出目录。"""
    skill_root = (_skills_root() / skill_name).resolve()
    if not skill_root.is_dir():
        return None
    normalized = (file_path or "").replace("\\", "/").strip().lstrip("/")
    if not normalized or ".." in Path(normalized).parts:
        return None
    target = (skill_root / normalized).resolve()
    try:
        target.relative_to(skill_root)
    except ValueError:
        return None
    return target


def update_skill_file(skill_name: str, file_path: str, content: str) -> bool:
    """更新 Skill 中的文件"""
    file_path_obj = _resolve_safe_skill_file(skill_name, file_path)
    if file_path_obj is None:
        return False
    file_path_obj.parent.mkdir(parents=True, exist_ok=True)

    try:
        file_path_obj.write_text(content, encoding="utf-8")
        logger.info("Updated skill file: %s/%s", skill_name, file_path)
        return True
    except Exception as e:
        logger.error("Failed to update skill file %s/%s: %s", skill_name, file_path, e)
        return False


def read_skill_file(skill_name: str, file_path: str) -> Optional[str]:
    """读取 Skill 中的文件"""
    file_path_obj = _resolve_safe_skill_file(skill_name, file_path)
    if file_path_obj is None or not file_path_obj.is_file():
        return None

    try:
        return file_path_obj.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed to read skill file %s/%s: %s", skill_name, file_path, e)
        return None


def get_skill_as_dict(skill_name: str) -> Optional[Dict[str, Any]]:
    """获取 Skill 信息为字典格式（用于 API 响应）"""
    skill = load_skill(skill_name)
    if not skill:
        return None

    return {
        "name": skill.name,
        "description": skill.description,
        "trigger_keywords": skill.trigger_keywords,
        "category": skill.category,
        "version": skill.version,
        "examples": skill.examples,
        "body": skill.body,
        "enabled": skill.enabled,
        "source": skill.source,
        "files": [
            {
                "path": f.path,
                "name": f.name,
                "size": f.size,
                "is_directory": f.is_directory,
                "file_type": f.file_type,
            }
            for f in skill.files
        ],
    }


def list_skills_as_dicts() -> List[Dict[str, Any]]:
    """获取所有 Skills 信息为字典列表"""
    skills = list_skills_from_files()
    return [
        {
            "name": s.name,
            "description": s.description,
            "trigger_keywords": s.trigger_keywords,
            "category": s.category,
            "version": s.version,
            "examples": s.examples,
            "enabled": s.enabled,
            "file_count": len([f for f in s.files if not f.is_directory]),
            "files": [
                {
                    "path": f.path,
                    "name": f.name,
                    "size": f.size,
                    "is_directory": f.is_directory,
                    "file_type": f.file_type,
                }
                for f in s.files
            ],
        }
        for s in skills
    ]