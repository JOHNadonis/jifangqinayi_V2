# DC-Visualizer 机房管理系统 - Mac mini 部署指南

## 📋 Mac mini M4 配置确认

Mac mini M4 配置非常适合运行这个系统：
- ✅ Apple M4 芯片（ARM64 架构）
- ✅ 16GB+ 内存（绰绰有余）
- ✅ 256GB+ SSD（足够使用）

---

## 🚀 部署方式选择

### 方式一：Docker 部署（推荐）

优点：隔离性好，便于管理
缺点：需要安装 Docker Desktop

### 方式二：直接部署（无 Docker）

优点：性能更好，配置简单
缺点：需要手动管理服务

**推荐使用方式二**，因为 Mac mini 作为专用服务器，直接部署更简单高效。

---

## 📦 方式一：Docker 部署

### 1. 安装 Docker Desktop

下载地址：https://www.docker.com/products/docker-desktop/

选择 **Apple Silicon** 版本下载安装。

### 2. 配置 Docker

打开 Docker Desktop：
- Settings → Resources → 分配 4GB+ 内存
- Settings → General → 勾选 "Start Docker Desktop when you log in"

### 3. 部署项目

```bash
# 打开终端，进入项目目录
cd /path/to/dc-visualizer

# 创建环境变量文件
cp .env.example .env

# 编辑配置（修改 JWT_SECRET）
nano .env

# 构建并启动
docker compose up -d

# 查看状态
docker compose ps
```

### 4. 设置开机自启

Docker Desktop 会自动启动，容器设置了 `restart: unless-stopped`，会自动跟随启动。

---

## ⚡ 方式二：直接部署（推荐）

### 步骤 1：安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 步骤 2：安装 Node.js 和 pnpm

```bash
# 安装 Node.js 20
brew install node@20

# 安装 pnpm
npm install -g pnpm
```

### 步骤 3：安装 Nginx

```bash
brew install nginx
```

### 步骤 4：部署项目

```bash
# 创建项目目录
sudo mkdir -p /opt/dc-visualizer
cd /opt/dc-visualizer

# 复制项目文件（假设项目在你的 Downloads 目录）
cp -r ~/Downloads/jifangqinayi_V2/* .

# 安装依赖
pnpm install

# 构建前端
pnpm build:web

# 构建后端
pnpm build:api

# 初始化数据库
pnpm db:generate
pnpm db:push
```

### 步骤 5：配置 Nginx

```bash
# 编辑 Nginx 配置
sudo nano /opt/homebrew/etc/nginx/nginx.conf
```

将以下内容替换到配置文件：

```nginx
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name localhost;

        # 前端静态文件
        location / {
            root /opt/dc-visualizer/apps/web/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # API 代理
        location /api {
            proxy_pass http://127.0.0.1:3001;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
```

### 步骤 6：创建启动脚本

```bash
# 创建启动脚本
cat > /opt/dc-visualizer/start-server.sh << 'EOF'
#!/bin/bash
cd /opt/dc-visualizer/apps/api
export NODE_ENV=production
export DATABASE_URL="file:./prisma/prod.db"
export JWT_SECRET="your-secret-key-change-this"
export PORT=3001
node dist/main.js
EOF

chmod +x /opt/dc-visualizer/start-server.sh
```

### 步骤 7：配置开机自启（launchd）

```bash
# 创建 API 服务配置
sudo tee /Library/LaunchDaemons/com.dc-visualizer.api.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dc-visualizer.api</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/node</string>
        <string>/opt/dc-visualizer/apps/api/dist/main.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/opt/dc-visualizer/apps/api</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>DATABASE_URL</key>
        <string>file:./prisma/prod.db</string>
        <key>JWT_SECRET</key>
        <string>your-secret-key-change-this-to-random-string</string>
        <key>PORT</key>
        <string>3001</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/opt/dc-visualizer/logs/api.log</string>
    <key>StandardErrorPath</key>
    <string>/opt/dc-visualizer/logs/api-error.log</string>
</dict>
</plist>
EOF

# 创建日志目录
sudo mkdir -p /opt/dc-visualizer/logs

# 启动 API 服务
sudo launchctl load /Library/LaunchDaemons/com.dc-visualizer.api.plist

# 启动 Nginx
brew services start nginx
```

### 步骤 8：验证部署

```bash
# 检查 API 服务
curl http://localhost:3001/api/health

# 检查 Nginx
curl http://localhost
```

---

## 🔧 常用命令

### 服务管理

```bash
# 启动 API
sudo launchctl load /Library/LaunchDaemons/com.dc-visualizer.api.plist

# 停止 API
sudo launchctl unload /Library/LaunchDaemons/com.dc-visualizer.api.plist

# 重启 API
sudo launchctl unload /Library/LaunchDaemons/com.dc-visualizer.api.plist
sudo launchctl load /Library/LaunchDaemons/com.dc-visualizer.api.plist

# 启动/停止/重启 Nginx
brew services start nginx
brew services stop nginx
brew services restart nginx

# 查看日志
tail -f /opt/dc-visualizer/logs/api.log
```

### 更新部署

```bash
cd /opt/dc-visualizer

# 停止服务
sudo launchctl unload /Library/LaunchDaemons/com.dc-visualizer.api.plist

# 更新代码
git pull  # 或手动复制新文件

# 重新构建
pnpm install
pnpm build:web
pnpm build:api

# 启动服务
sudo launchctl load /Library/LaunchDaemons/com.dc-visualizer.api.plist
brew services restart nginx
```

---

## 🌐 局域网访问

Mac mini 部署后，同一局域网内的其他设备可以通过 Mac mini 的 IP 访问：

```bash
# 查看 Mac mini 的 IP 地址
ipconfig getifaddr en0
```

假设 IP 是 `192.168.1.100`，则访问地址为：`http://192.168.1.100`

### 固定 IP 地址

建议在路由器中给 Mac mini 设置 DHCP 保留，或者在 Mac 系统设置中配置静态 IP：

1. 系统设置 → 网络 → Wi-Fi/以太网 → 详细信息
2. TCP/IP → 配置 IPv4 → 手动
3. 设置固定 IP、子网掩码、路由器地址

---

## 🔒 防火墙设置

macOS 默认允许入站连接，但如果开启了防火墙，需要允许 nginx：

1. 系统设置 → 网络 → 防火墙
2. 选项 → 添加应用 → 选择 `/opt/homebrew/bin/nginx`

---

## 📊 资源监控

```bash
# 查看 Node 进程
ps aux | grep node

# 查看端口占用
lsof -i :80
lsof -i :3001

# 查看系统资源
top
# 或安装 htop
brew install htop
htop
```

---

## ✅ 部署检查清单

- [ ] Node.js 20 已安装
- [ ] pnpm 已安装
- [ ] Nginx 已安装
- [ ] 项目已构建（web + api）
- [ ] 数据库已初始化
- [ ] API 服务已启动（端口 3001）
- [ ] Nginx 已启动（端口 80）
- [ ] 可以访问 http://localhost
- [ ] 可以访问 http://Mac-mini-IP（从其他设备）
- [ ] 已设置开机自启

---

## 🐛 常见问题

### Q: 端口 80 被占用

```bash
# 查看占用进程
sudo lsof -i :80

# 如果是 Apache，停止它
sudo apachectl stop
```

### Q: 权限不足

```bash
# 确保项目目录权限正确
sudo chown -R $(whoami) /opt/dc-visualizer
```

### Q: Nginx 配置错误

```bash
# 测试配置文件
nginx -t

# 查看错误日志
tail -f /opt/homebrew/var/log/nginx/error.log
```
