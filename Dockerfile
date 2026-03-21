# ============================================
# 阶段1: 构建前端
# ============================================
FROM node:20-alpine AS web-builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# 安装依赖
RUN pnpm install --frozen-lockfile --filter @dc-visualizer/web

# 复制前端源码
COPY apps/web ./apps/web

# 构建前端
RUN pnpm --filter @dc-visualizer/web run build

# ============================================
# 阶段2: 构建后端
# ============================================
FROM node:20-alpine AS api-builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package 文件
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# 安装依赖
RUN pnpm install --frozen-lockfile --filter @dc-visualizer/api

# 复制后端源码
COPY apps/api ./apps/api

# 生成 Prisma Client
RUN pnpm --filter @dc-visualizer/api run db:generate

# 构建后端
RUN pnpm --filter @dc-visualizer/api run build

# ============================================
# 阶段3: 生产镜像
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm 和必要工具
RUN npm install -g pnpm && \
    apk add --no-cache nginx

# 复制后端构建产物
COPY --from=api-builder /app/apps/api/dist ./api/dist
COPY --from=api-builder /app/apps/api/node_modules ./api/node_modules
COPY --from=api-builder /app/apps/api/package.json ./api/
COPY --from=api-builder /app/apps/api/prisma ./api/prisma

# 复制前端构建产物
COPY --from=web-builder /app/apps/web/dist ./web/dist

# 复制 nginx 配置
COPY deploy/nginx.conf /etc/nginx/nginx.conf

# 复制启动脚本
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 创建数据目录
RUN mkdir -p /app/data

# 环境变量
ENV NODE_ENV=production
ENV DATABASE_URL="file:/app/data/prod.db"
ENV JWT_SECRET="your-super-secret-jwt-key-change-in-production"
ENV PORT=3001

# 暴露端口
EXPOSE 80

# 启动
CMD ["/app/start.sh"]
