#!/bin/bash

# ============================================
# Cloudflare Tunnel 配置脚本
# 用于 DC-Visualizer 外网访问
# ============================================

set -e

echo "============================================"
echo "  Cloudflare Tunnel 配置向导"
echo "============================================"
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}>>> 正在安装 cloudflared...${NC}"
    if [[ "$(uname)" == "Darwin" ]]; then
        brew install cloudflared
    else
        # Linux
        curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared.deb
        rm cloudflared.deb
    fi
fi

echo -e "${GREEN}✓ cloudflared 已安装${NC}"
echo ""

# 检查是否已登录
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo -e "${YELLOW}>>> 请在浏览器中登录 Cloudflare 并授权...${NC}"
    cloudflared tunnel login
fi

echo ""
echo -e "${BLUE}请输入以下信息：${NC}"
echo ""

# 获取隧道名称
read -p "隧道名称 (默认: dc-visualizer): " TUNNEL_NAME
TUNNEL_NAME=${TUNNEL_NAME:-dc-visualizer}

# 获取域名
read -p "你的域名 (例如: dc.example.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    echo "域名不能为空！"
    exit 1
fi

echo ""
echo ">>> 创建隧道: $TUNNEL_NAME"

# 检查隧道是否已存在
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
    echo -e "${YELLOW}隧道 $TUNNEL_NAME 已存在，跳过创建${NC}"
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
else
    # 创建隧道
    cloudflared tunnel create "$TUNNEL_NAME"
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

echo "隧道 ID: $TUNNEL_ID"

# 获取用户名
USERNAME=$(whoami)

# 创建配置文件
echo ""
echo ">>> 创建配置文件..."

mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: /Users/$USERNAME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN_NAME
    service: http://localhost:80
  - service: http_status:404
EOF

echo -e "${GREEN}✓ 配置文件已创建: ~/.cloudflared/config.yml${NC}"

# 配置 DNS
echo ""
echo ">>> 配置 DNS 记录..."
cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN_NAME" || true

echo ""
echo ">>> 测试隧道连接..."
echo -e "${YELLOW}按 Ctrl+C 停止测试${NC}"
echo ""

# 测试运行
timeout 10 cloudflared tunnel run "$TUNNEL_NAME" || true

echo ""
read -p "隧道测试正常吗？是否配置开机自启？(y/n): " AUTOSTART

if [[ "$AUTOSTART" == "y" || "$AUTOSTART" == "Y" ]]; then
    echo ">>> 配置开机自启..."

    if [[ "$(uname)" == "Darwin" ]]; then
        # macOS
        sudo cloudflared service install
        sudo launchctl start com.cloudflare.cloudflared
    else
        # Linux
        sudo cloudflared service install
        sudo systemctl enable cloudflared
        sudo systemctl start cloudflared
    fi

    echo -e "${GREEN}✓ 开机自启已配置${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  配置完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "外网访问地址: https://$DOMAIN_NAME"
echo ""
echo "常用命令:"
echo "  查看状态:  cloudflared tunnel info $TUNNEL_NAME"
echo "  查看日志:  sudo cat /var/log/cloudflared.log"
echo "  手动启动:  cloudflared tunnel run $TUNNEL_NAME"
echo ""
