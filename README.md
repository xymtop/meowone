# MeowOne AI Operating System

以对话为核心入口的 AI 操作系统。用户通过自然语言表达需求，系统自动理解意图、调度智能体完成任务，并以对话或卡片的形式返回结果。

## Quick Start

### 1. 配置环境变量

```bash
cp .env.example backend/.env
```

编辑 `backend/.env`，填入你的 LLM API Key：

```
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

支持所有 OpenAI 兼容 API（OpenAI、Deepseek、Together AI、Groq 等）。

### 2. 启动后端

```bash
cd backend
pip3 install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000 即可使用。

## Docker Compose

```bash
# 编辑 backend/.env 填入 API Key
docker compose up --build
```

- 前端: http://localhost:3000
- 后端: http://localhost:8000
- API 文档: http://localhost:8000/docs

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + Zustand |
| Backend | Python FastAPI + SQLite + SSE |
| LLM | OpenAI-compatible API (hand-written client) |
| Agent | Hand-written Agent Loop runtime |
