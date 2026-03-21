#!/bin/sh

echo "================================================"
echo "  DC-Visualizer 机房管理系统 启动中..."
echo "================================================"

# 进入 API 目录
cd /app/api

# 初始化数据库（如果不存在）
if [ ! -f "/app/data/prod.db" ]; then
    echo ">>> 首次启动，初始化数据库..."
    npx prisma db push --accept-data-loss
    echo ">>> 数据库初始化完成"
fi

# 启动后端 API（后台运行）
echo ">>> 启动后端 API 服务..."
node dist/main.js &

# 等待 API 启动
sleep 3

# 启动 Nginx
echo ">>> 启动 Nginx 服务..."
nginx -g 'daemon off;'
