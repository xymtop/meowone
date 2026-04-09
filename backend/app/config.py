# MeowOne 后端配置模块
# 从环境变量加载配置，供全应用使用

from __future__ import annotations
import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

# ============================================================
# LLM（大语言模型）配置
# ============================================================
# LLM API 密钥，用于调用大语言模型 API
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
# LLM API 基础地址，默认为 OpenAI API 地址
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
# 默认使用的模型名称
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")

# ============================================================
# 数据库配置
# ============================================================
# SQLite 数据库文件路径
DATABASE_PATH = os.getenv("DATABASE_PATH", "meowone.db")

# ============================================================
# Loop（智能体循环）配置
# ============================================================
# 最大对话轮次数，超过此数则强制结束循环
LOOP_MAX_ROUNDS = int(os.getenv("LOOP_MAX_ROUNDS", "16"))
# 最大工具调用阶段数，每个阶段可并行执行多个工具
LOOP_MAX_TOOL_PHASES = max(1, int(os.getenv("LOOP_MAX_TOOL_PHASES", "8")))
# 循环超时时间（秒），超过此时间强制结束
LOOP_TIMEOUT_SECONDS = int(os.getenv("LOOP_TIMEOUT_SECONDS", "120"))
# 单个工具调用超时时间（秒）
TOOL_TIMEOUT_SECONDS = int(os.getenv("TOOL_TIMEOUT_SECONDS", "30"))

# ============================================================
# Agent Skills / MCP / 上下文配置
# ============================================================
# Agent Skills 配置文件目录，默认在仓库根目录的 .meowone/
MEOWONE_CONFIG_DIR = os.getenv("MEOWONE_CONFIG_DIR", ".meowone")
# 上下文最大字符数限制
MAX_CONTEXT_CHARS = int(os.getenv("MAX_CONTEXT_CHARS", "24000"))
# Agent Skills 最大字符数限制
MAX_SKILLS_CHARS = int(os.getenv("MAX_SKILLS_CHARS", "8000"))

# ============================================================
# 沙箱配置（bash/文件工具的工作目录）
# ============================================================
# 工作空间根目录，bash 和文件工具的默认操作目录
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", "")
# 是否允许执行 bash 命令（0/1 或 true/false 或 yes）
MEOWONE_ALLOW_BASH = os.getenv("MEOWONE_ALLOW_BASH", "0").lower() in ("1", "true", "yes")

# ============================================================
# E2B 云端沙箱配置（可选功能）
# ============================================================
# E2B API 密钥，需要在 https://e2b.dev 注册获取
E2B_API_KEY = os.getenv("E2B_API_KEY", "")
# E2B 沙箱超时时间（秒）
E2B_TIMEOUT_SECONDS = int(os.getenv("E2B_TIMEOUT_SECONDS", "120"))
