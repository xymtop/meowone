# ============================================================
# 前端 Dockerfile
# 镜像：xiaoyemiao/meowone-frontend:latest
# 用法（与后端一起用 docker-compose）：
#     docker-compose up -d
#
# 单独运行（需自行配置 NEXT_PUBLIC_API_URL）：
#     docker run -d -p 3000:3000 \
#       -e NEXT_PUBLIC_API_URL=http://your-backend:8000 \
#       --name meowone-frontend \
#       xiaoyemiao/meowone-frontend:latest
#
# 查看日志：
#     docker logs -f meowone-frontend
# ============================================================

# ---- 构建阶段 ----
FROM node:22-slim AS builder

WORKDIR /app

# 先复制依赖清单，快速失败
COPY package.json pnpm-lock.yaml* ./

# 使用阿里云镜像加速安装
RUN corepack enable pnpm && \
    pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --no-frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# ---- 最终镜像 ----
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 只复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# next.config.mjs 必须开启 standalone 输出模式才能独立运行
EXPOSE 3000

CMD ["node", "server.js"]
