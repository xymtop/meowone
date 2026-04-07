# MeowOne AI Operating System

以**对话**为核心入口的 AI 操作系统：用户用自然语言描述需求，系统理解意图、在**主循环**里调度工具与远程智能体，并通过 **SSE 流式**返回思考过程、正文与卡片式 UI（A2UI）。

---

## 功能概览

- **会话与消息**：多会话管理，SQLite 持久化；支持上下文裁剪与历史回放。
- **主智能体循环**：手写 Agent Loop（`backend/app/loop/`），对 OpenAI 兼容 API 发起补全，支持多轮工具调用；工具可在同一轮内**并行**执行（`asyncio.gather`）。
- **能力（工具）**：工作区读写与目录列举、MCP 工具列举与调用、子智能体调度、卡片构建、可选 Bash；远程 **A2A** 智能体注册为与 OpenAI 一致的 function tools。
- **多模态输入**：聊天接口支持文本 + 附件；图片走 `image_url`，其它文件以文本片段注入上下文。
- **前端**：Next.js 对话界面、Markdown 渲染、A2UI 卡片块（`@a2ui-sdk/react`）。
- **配置目录 `.meowone/`**：Skills、MCP、远程智能体列表等；后端提供只读 API 供设置页展示。

---

## 架构简述

```
┌─────────────┐     HTTP/SSE      ┌─────────────────────────────────────┐
│  Next.js    │ ◄──────────────► │  FastAPI (sessions / messages /     │
│  frontend   │                   │  chat SSE / meowone config)        │
└─────────────┘                   └──────────────┬──────────────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │  SQLite DB    │           │ OpenAI-compat │           │ MCP / Workspace│
            │  (sessions)   │           │ LLM API       │           │ / Bash / Cards │
            └───────────────┘           └───────────────┘           └───────────────┘
                                                 │
                                                 ▼
                                    ┌───────────────────────────┐
                                    │ 可选：远程 A2A 子智能体      │
                                    │ (a2a-sdk HTTP, agents.yaml) │
                                    └───────────────────────────┘
```

编排思路见 `backend/app/loop/orchestration.py`：远程智能体统一映射为 **function tools**，主循环内模型决定何时调用；复杂 DAG 可在未来用独立调度器扩展。

---

## 环境要求

- **后端**：Python 3.9+（与 `backend/Dockerfile` 一致）；推荐 3.10+ 以与 `agents/` 子项目一致。
- **前端**：Node.js 20+（与 `frontend/Dockerfile` 一致）。
- **可选**：本仓库根目录与 `backend/` 下配置了 [uv](https://docs.astral.sh/uv/) 的清华 PyPI 镜像，在中国大陆可加速依赖安装。

---

## 快速开始（本地开发）

### 1. 配置环境变量

将示例文件复制为后端环境文件并编辑：

```bash
cp backend/.env.example backend/.env
```

在 `backend/.env` 中至少配置 **LLM**（任意 OpenAI 兼容端点均可）：

```env
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

前端若不在默认地址访问后端，可配置 `frontend/.env.local`（可从仓库根目录 `.env.example` 参考）：

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 2. 启动后端

```bash
cd backend
pip3 install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- 健康检查：<http://localhost:8000/health>
- OpenAPI 文档：<http://localhost:8000/docs>

数据库文件默认 `backend/meowone.db`（可通过 `DATABASE_PATH` 修改）。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认打开 <http://localhost:3000>，通过 `NEXT_PUBLIC_API_URL` 指向后端。

---

## Docker Compose

先准备好 `backend/.env`（含 `LLM_API_KEY` 等），然后在仓库根目录执行：

```bash
docker compose up --build
```

- **后端**：<http://localhost:8000>
- **前端**：映射为宿主机的 **9006** 端口（容器内仍为 3000），即 <http://localhost:9006>
- 后端数据卷 `backend-data` 持久化到容器内 `/app/data/meowone.db`

Compose 里前端环境变量 `NEXT_PUBLIC_API_URL=http://localhost:8000` 在**浏览器**侧使用，请确保该 URL 从用户机器可访问（本机开发时通常即后端宿主机地址）。

---

## 后端环境变量说明

以下与 `backend/.env.example` 一致，便于按需调优。

| 变量 | 说明 |
|------|------|
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | OpenAI 兼容 API 密钥、基地址、模型名 |
| `DATABASE_PATH` | SQLite 路径，默认 `meowone.db` |
| `LOOP_MAX_ROUNDS` | 主循环最大轮数 |
| `LOOP_MAX_TOOL_PHASES` | 单条用户消息下，工具相位的最大轮次（模型可多次 tool → observe） |
| `LOOP_TIMEOUT_SECONDS` / `TOOL_TIMEOUT_SECONDS` | 整轮循环与单工具超时（秒） |
| `MEOWONE_CONFIG_DIR` | 配置根目录，默认仓库下 `.meowone` |
| `MAX_CONTEXT_CHARS` / `MAX_SKILLS_CHARS` | 注入上下文的字符上限与 Skills 总长度上限 |
| `AGENTS_CONFIG_PATH` | 可选；覆盖默认的 `.meowone/agents.yaml` |
| `WORKSPACE_ROOT` | 工作区根路径；未设时由后端解析为**仓库根**，供读写文件与 Bash |
| `MEOWONE_ALLOW_BASH` | `1` / `true` 时启用 Bash 工具（默认关闭，请注意安全） |

---

## `.meowone/` 配置目录

默认位于**仓库根目录**下的 `.meowone/`，可被 `MEOWONE_CONFIG_DIR` 覆盖。

| 文件 / 目录 | 作用 |
|-------------|------|
| `agents.yaml` | 声明远程 **A2A** 智能体：`tool_name`、`description`、`base_url`、`enabled` |
| `mcp.json` | MCP 服务器配置（与后端 MCP 工具配合） |
| `channels.yaml` | 渠道能力策略（按 `channel_id` 的 `allow_tools` / `deny_tools`） |
| `skills/`、`rules/` 等 | 可被加载为 Skills / 规则文本（具体见运行时 prompt 与 `config_loaders`） |

后端 **`GET /api/meowone/config`** 会列出目录内部分文本类文件（如 `.md`、`.json`、`.yaml`），供前端设置界面只读展示。

---

## 远程 A2A 子智能体（可选）

主服务启动时会读取 `agents.yaml`，将每个启用的远程代理注册为**具名工具**（如 `code_writer`、`doc_assistant`）。这些进程需 **先于或与主后端同时**在对应 `base_url` 可访问。

仓库自带两个示例（[A2A](https://github.com/a2aproject/a2a) + `a2a-sdk`）：

| 目录 | 默认端口 | 说明 |
|------|----------|------|
| `agents/code-writer` | `8001`（`PORT` 环境变量可改） | 代码编写、重构、审查 |
| `agents/doc-assistant` | `8002` | 文档、摘要、改写 |
| `agents/mermaid-assistant` | `8003` | Mermaid 图表生成与改写（流程图、时序图、ER 图等） |

在各自目录安装依赖后启动，例如：

```bash
cd agents/code-writer
pip install -e .   # 或使用 uv，按你本机习惯
python __main__.py
```

子智能体通常也需要能访问 LLM，请在对应目录配置 `.env`（与子项目内 `llm` 模块一致）。`agents.yaml` 中的 `base_url` 必须与进程实际监听地址一致（默认示例如 `http://127.0.0.1:8001`）。

---

## 主要 HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| | `/api/sessions` | 会话列表与创建（见 OpenAPI） |
| | `/api/sessions/{id}/messages` | 消息列表 |
| `POST` | `/api/sessions/{session_id}/chat` | 发送用户消息，**SSE** 流式返回事件 |
| `POST` | `/api/sessions/{session_id}/card-action` | 卡片交互 |
| `POST` | `/api/sessions/{session_id}/a2ui-action` | A2UI 交互回传（SSE） |
| `POST` | `/api/gateway/turn` | 多渠道统一入口（`channel_id` + `external_thread_id`/`session_id`） |
| `POST` | `/v1/chat/completions` | OpenAI 兼容协议（当前支持 `stream=true`） |
| `GET` | `/api/meowone/config` | 列出 `.meowone` 下可读配置文件 |

流式事件类型包括思考片段、文本增量、工具调用/结果、卡片、错误与结束等（见 `backend/app/loop/events.py`）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16、React 19、TypeScript、Tailwind CSS 4、shadcn/ui、Zustand、react-markdown、A2UI SDK |
| 后端 | Python、FastAPI、SQLite（aiosqlite）、SSE（sse-starlette）、手写 LLM Client 与 Agent Loop |
| 协议与集成 | OpenAI 兼容 Chat Completions、MCP（stdio）、A2A（`a2a-sdk`） |

---

## 仓库结构（节选）

```
meowone/
├── backend/           # FastAPI 应用
│   └── app/
│       ├── api/       # REST + SSE
│       ├── loop/      # runtime、events、context
│       ├── capability/tools/  # 各类工具
│       └── mcp/       # MCP 会话
├── frontend/          # Next.js 应用
├── agents/            # 可选 A2A 子服务（code-writer、doc-assistant）
├── .meowone/          # 项目级配置（agents、MCP、skills…）
├── docker-compose.yml
└── README.md
```

---

## 许可证与贡献

若后续补充开源许可证或贡献指南，可在此追加说明。当前以项目维护者约定为准。
