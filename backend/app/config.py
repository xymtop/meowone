from __future__ import annotations
import os
from dotenv import load_dotenv

load_dotenv()

LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")

DATABASE_PATH = os.getenv("DATABASE_PATH", "meowone.db")

LOOP_MAX_ROUNDS = int(os.getenv("LOOP_MAX_ROUNDS", "10"))
LOOP_TIMEOUT_SECONDS = int(os.getenv("LOOP_TIMEOUT_SECONDS", "120"))
TOOL_TIMEOUT_SECONDS = int(os.getenv("TOOL_TIMEOUT_SECONDS", "30"))
