#!/bin/bash

# ============================================
# DC-Visualizer 一键部署脚本
# 适用于 Ubuntu/Debian 系统
# ============================================

set -e

echo "============================================"
echo "  DC-Visualizer 一键部署脚本"
echo "============================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}提示: 建议使用 root 用户运行此脚本${NC}"
    echo "你可以使用: sudo bash deploy.sh"
    echo ""
fi

# 检查 Docker 是否安装
check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker 已安装${NC}"
        docker --version
        return 0
    else
        return 1
    fi
}

# 安装 Docker
install_docker() {
    echo -e "${YELLOW}>>> 正在安装 Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✓ Docker 安装完成${NC}"
}

# 生成随机 JWT 密钥
generate_jwt_secret() {
    openssl rand -base64 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
}

# 主流程
main() {
    echo ">>> 检查系统环境..."
    echo ""

    # 检查并安装 Docker
    if ! check_docker; then
        echo -e "${YELLOW}Docker 未安装，开始安装...${NC}"
        install_docker
    fi

    # 检查 docker compose
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
    else
        echo -e "${RED}✗ Docker Compose 未安装${NC}"
        echo "请升级 Docker 或手动安装 docker-compose-plugin"
        exit 1
    fi

    echo ""
    echo ">>> 配置环境变量..."

    # 创建 .env 文件
    if [ ! -f .env ]; then
        JWT_SECRET=$(generate_jwt_secret)
        cat > .env << EOF
# 生产环境配置 - 自动生成于 $(date)
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=file:/app/data/prod.db
PORT=3001
EOF
        echo -e "${GREEN}✓ 已生成 .env 配置文件${NC}"
    else
        echo -e "${YELLOW}! .env 文件已存在，跳过生成${NC}"
    fi

    echo ""
    echo ">>> 构建 Docker 镜像..."
    docker compose build

    echo ""
    echo ">>> 启动服务..."
    docker compose up -d

    echo ""
    echo ">>> 等待服务启动..."
    sleep 5

    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        echo ""
        echo -e "${GREEN}============================================${NC}"
        echo -e "${GREEN}  ✓ 部署成功！${NC}"
        echo -e "${GREEN}============================================${NC}"
        echo ""
        echo "访问地址: http://$(hostname -I | awk '{print $1}')"
        echo ""
        echo "默认账号: admin"
        echo "默认密码: admin123"
        echo ""
        echo -e "${YELLOW}重要: 请登录后立即修改默认密码！${NC}"
        echo ""
        echo "常用命令:"
        echo "  查看状态:  docker compose ps"
        echo "  查看日志:  docker compose logs -f"
        echo "  停止服务:  docker compose down"
        echo "  重启服务:  docker compose restart"
    else
        echo -e "${RED}部署可能失败，请检查日志:${NC}"
        echo "docker compose logs"
    fi
}

# 运行主流程
main
