# ============================================================
# 后端 Dockerfile
# 镜像：xiaoyemiao/meowone-backend:latest
# 用法：
#   单机运行（推荐）：
#     docker run -d -p 8000:8000 \
#       -e LLM_API_KEY=your-key \
#       -e LLM_BASE_URL=https://api.openai.com/v1 \
#       -e LLM_MODEL=gpt-4o \
#       --name meowone-backend \
#       xiaoyemiao/meowone-backend:latest
#
#   共享本地数据库（数据持久化到宿主机）：
#     -v $(pwd)/data:/app/data \
#     -e DATABASE_PATH=/app/data/meowone.db \
#
#   查看日志：
#     docker logs -f meowone-backend
# ============================================================

FROM python:3.11-slim AS builder

WORKDIR /app

# 安装编译依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


# ---- 最终镜像 ----
FROM python:3.11-slim

WORKDIR /app

# 只复制已安装好的 site-packages（不包含源码，减小体积）
COPY --from=builder /root/.local /root/.local

# 复制应用代码
COPY app ./app
COPY .meowone ./.meowone

# 运行时目录与数据库目录
RUN mkdir -p /app/data

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV DATABASE_PATH=/app/data/meowone.db

EXPOSE 8000

# 默认启动命令；若挂载了 /app/data，则数据库自动持久化
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
