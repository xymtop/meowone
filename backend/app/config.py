from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")

DATABASE_PATH = os.getenv("DATABASE_PATH", "meowone.db")

LOOP_MAX_ROUNDS = int(os.getenv("LOOP_MAX_ROUNDS", "16"))
LOOP_MAX_TOOL_PHASES = max(1, int(os.getenv("LOOP_MAX_TOOL_PHASES", "8")))
LOOP_TIMEOUT_SECONDS = int(os.getenv("LOOP_TIMEOUT_SECONDS", "120"))
TOOL_TIMEOUT_SECONDS = int(os.getenv("TOOL_TIMEOUT_SECONDS", "30"))

# Agent skills / MCP / context: `.meowone/` at repository root by default
MEOWONE_CONFIG_DIR = os.getenv("MEOWONE_CONFIG_DIR", ".meowone")
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "24000"))
MAX_SKILLS_CHARS = int(os.getenv("MAX_SKILLS_CHARS", "8000"))

# Sandbox: bash / file tools default to repository root
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", "")
MEOWONE_ALLOW_BASH = os.getenv("MEOWONE_ALLOW_BASH", "0").lower() in ("1", "true", "yes")
