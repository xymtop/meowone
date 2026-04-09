from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件（优先项目根目录）
_dotenv = Path(__file__).resolve().parents[2] / ".env"
if _dotenv.exists():
    load_dotenv(dotenv_path=str(_dotenv))
else:
    load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")

# 数据库路径：优先使用绝对路径，如果没有则相对于项目根目录
_DB_RAW = os.getenv("DATABASE_PATH", "meowone.db")
if Path(_DB_RAW).is_absolute():
    DATABASE_PATH = _DB_RAW
else:
    _repo_root = Path(__file__).resolve().parents[2]  # backend_v2/app/.. = meowone/
    DATABASE_PATH = str(_repo_root / _DB_RAW)

LOOP_MAX_ROUNDS = int(os.getenv("LOOP_MAX_ROUNDS", "16"))
LOOP_MAX_TOOL_PHASES = max(1, int(os.getenv("LOOP_MAX_TOOL_PHASES", "8")))
LOOP_TIMEOUT_SECONDS = int(os.getenv("LOOP_TIMEOUT_SECONDS", "120"))
TOOL_TIMEOUT_SECONDS = int(os.getenv("TOOL_TIMEOUT_SECONDS", "30"))

MEOWONE_CONFIG_DIR = os.getenv("MEOWONE_CONFIG_DIR", ".meowone")
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "24000"))
MAX_SKILLS_CHARS = int(os.getenv("MAX_SKILLS_CHARS", "8000"))

WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", "")
MEOWONE_ALLOW_BASH = os.getenv("MEOWONE_ALLOW_BASH", "0").lower() in ("1", "true", "yes")

E2B_API_KEY = os.getenv("E2B_API_KEY", "")
E2B_TIMEOUT_SECONDS = int(os.getenv("E2B_TIMEOUT_SECONDS", "120"))
