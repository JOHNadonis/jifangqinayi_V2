#!/bin/bash

# ============================================
# DC-Visualizer Mac mini 一键部署脚本
# 适用于 macOS (Apple Silicon M1/M2/M3/M4)
# ============================================

set -e

echo "============================================"
echo "  DC-Visualizer Mac mini 部署脚本"
echo "============================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目目录
PROJECT_DIR="/opt/dc-visualizer"

# 检查是否为 macOS
if [[ "$(uname)" != "Darwin" ]]; then
    echo -e "${RED}错误: 此脚本仅适用于 macOS${NC}"
    exit 1
fi

# 检查架构
ARCH=$(uname -m)
echo -e "${BLUE}系统架构: ${ARCH}${NC}"

# 检查 Homebrew
check_homebrew() {
    if command -v brew &> /dev/null; then
        echo -e "${GREEN}✓ Homebrew 已安装${NC}"
        return 0
    else
        return 1
    fi
}

# 安装 Homebrew
install_homebrew() {
    echo -e "${YELLOW}>>> 正在安装 Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # 添加到 PATH (Apple Silicon)
    if [[ "$ARCH" == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    echo -e "${GREEN}✓ Homebrew 安装完成${NC}"
}

# 检查 Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js 已安装: ${NODE_VERSION}${NC}"
        return 0
    else
        return 1
    fi
}

# 检查 pnpm
check_pnpm() {
    if command -v pnpm &> /dev/null; then
        echo -e "${GREEN}✓ pnpm 已安装${NC}"
        return 0
    else
        return 1
    fi
}

# 检查 nginx
check_nginx() {
    if command -v nginx &> /dev/null; then
        echo -e "${GREEN}✓ Nginx 已安装${NC}"
        return 0
    else
        return 1
    fi
}

# 生成随机密钥
generate_secret() {
    openssl rand -base64 32
}

# 主流程
main() {
    echo ">>> 检查系统环境..."
    echo ""

    # 检查并安装 Homebrew
    if ! check_homebrew; then
        install_homebrew
    fi

    # 检查并安装 Node.js
    if ! check_node; then
        echo -e "${YELLOW}>>> 正在安装 Node.js...${NC}"
        brew install node@20
        brew link node@20 --force
    fi

    # 检查并安装 pnpm
    if ! check_pnpm; then
        echo -e "${YELLOW}>>> 正在安装 pnpm...${NC}"
        npm install -g pnpm
    fi

    # 检查并安装 nginx
    if ! check_nginx; then
        echo -e "${YELLOW}>>> 正在安装 Nginx...${NC}"
        brew install nginx
    fi

    echo ""
    echo ">>> 准备项目目录..."

    # 创建项目目录
    if [ ! -d "$PROJECT_DIR" ]; then
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown -R $(whoami) "$PROJECT_DIR"
    fi

    # 复制项目文件
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ "$SCRIPT_DIR" != "$PROJECT_DIR" ]; then
        echo ">>> 复制项目文件到 $PROJECT_DIR..."
        cp -r "$SCRIPT_DIR"/* "$PROJECT_DIR/"
    fi

    cd "$PROJECT_DIR"

    # 创建日志目录
    mkdir -p "$PROJECT_DIR/logs"

    echo ""
    echo ">>> 安装项目依赖..."
    pnpm install

    echo ""
    echo ">>> 构建前端..."
    pnpm build:web

    echo ""
    echo ">>> 构建后端..."
    pnpm build:api

    echo ""
    echo ">>> 初始化数据库..."
    pnpm db:generate
    pnpm db:push

    echo ""
    echo ">>> 配置 Nginx..."

    # Nginx 配置
    NGINX_CONF="/opt/homebrew/etc/nginx/nginx.conf"
    sudo tee "$NGINX_CONF" > /dev/null << EOF
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    server {
        listen 80;
        server_name localhost;

        location / {
            root $PROJECT_DIR/apps/web/dist;
            index index.html;
            try_files \$uri \$uri/ /index.html;
        }

        location /api {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_read_timeout 300s;
        }
    }
}
EOF

    echo ""
    echo ">>> 配置后端服务..."

    # 生成 JWT 密钥
    JWT_SECRET=$(generate_secret)

    # 创建 launchd 配置
    PLIST_FILE="/Library/LaunchDaemons/com.dc-visualizer.api.plist"
    sudo tee "$PLIST_FILE" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dc-visualizer.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>$PROJECT_DIR/apps/api/dist/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR/apps/api</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>DATABASE_URL</key>
        <string>file:./prisma/prod.db</string>
        <key>JWT_SECRET</key>
        <string>$JWT_SECRET</string>
        <key>PORT</key>
        <string>3001</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/logs/api.log</string>
    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/logs/api-error.log</string>
</dict>
</plist>
EOF

    echo ""
    echo ">>> 启动服务..."

    # 停止已有服务（如果存在）
    sudo launchctl unload "$PLIST_FILE" 2>/dev/null || true
    brew services stop nginx 2>/dev/null || true

    # 启动服务
    sudo launchctl load "$PLIST_FILE"
    brew services start nginx

    # 等待启动
    echo ">>> 等待服务启动..."
    sleep 3

    # 获取 IP 地址
    IP_ADDR=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ✓ 部署成功！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "本机访问: http://localhost"
    echo "局域网访问: http://${IP_ADDR}"
    echo ""
    echo "默认账号: admin"
    echo "默认密码: admin123"
    echo ""
    echo -e "${YELLOW}重要: 请登录后立即修改默认密码！${NC}"
    echo ""
    echo "常用命令:"
    echo "  查看 API 日志:  tail -f $PROJECT_DIR/logs/api.log"
    echo "  重启 API:       sudo launchctl unload $PLIST_FILE && sudo launchctl load $PLIST_FILE"
    echo "  重启 Nginx:     brew services restart nginx"
    echo ""
}

# 运行主流程
main
