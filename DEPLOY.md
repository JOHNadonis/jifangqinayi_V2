# DC-Visualizer 机房管理系统 - 部署文档

## 📋 目录

1. [服务器推荐配置](#服务器推荐配置)
2. [快速部署指南](#快速部署指南)
3. [详细部署步骤](#详细部署步骤)
4. [常用命令](#常用命令)
5. [故障排查](#故障排查)

---

## 🖥️ 服务器推荐配置

### 最低配置（个人/小团队使用）

| 配置项 | 推荐值 | 说明 |
|-------|--------|------|
| CPU | 2核 | 够用于日常操作 |
| 内存 | 2GB | Node.js + Nginx |
| 硬盘 | 40GB SSD | 系统+数据+日志 |
| 带宽 | 3-5Mbps | 内网使用足够 |
| 系统 | Ubuntu 22.04 / Debian 12 | 推荐 |

**预算参考**:
- 阿里云/腾讯云轻量服务器: ￥50-80/月
- 闲置小主机/NUC: 一次性 ￥500-1000

### 推荐配置（10-50人团队）

| 配置项 | 推荐值 |
|-------|--------|
| CPU | 4核 |
| 内存 | 4GB |
| 硬盘 | 80GB SSD |
| 带宽 | 5-10Mbps |

**预算参考**: ￥100-200/月

### 小型服务器推荐购买

如果你想买实体小服务器放在机房或办公室:

1. **Intel NUC 系列** (~￥1500-3000)
   - NUC11/12/13 i3/i5 版本
   - 8GB内存 + 256GB SSD
   - 低功耗，静音

2. **零刻/铭凡 迷你主机** (~￥1000-2000)
   - N100/N305 处理器
   - 8GB内存 + 256GB SSD
   - 性价比高

3. **树莓派 5** (~￥600-800)
   - 8GB版本
   - 外接SSD
   - 功耗极低

---

## 🚀 快速部署指南

### 一键部署（推荐）

```bash
# 1. 安装 Docker (如果没有)
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker

# 2. 下载项目
git clone <你的项目地址> dc-visualizer
cd dc-visualizer

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改 JWT_SECRET 为随机字符串
nano .env

# 4. 启动服务
docker compose up -d

# 5. 查看状态
docker compose ps
docker compose logs -f
```

**访问地址**: http://服务器IP

**默认账号**: admin / admin123

---

## 📝 详细部署步骤

### 步骤 1: 准备服务器

#### Ubuntu/Debian 系统

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl git

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER

# 重新登录使权限生效
exit
# 重新 SSH 登录
```

#### CentOS/RHEL 系统

```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker
```

### 步骤 2: 上传项目代码

#### 方式一: Git 克隆

```bash
git clone <项目地址> /opt/dc-visualizer
cd /opt/dc-visualizer
```

#### 方式二: 手动上传

将整个项目文件夹上传到服务器 `/opt/dc-visualizer` 目录

可以使用 WinSCP、FileZilla 或 scp 命令:

```bash
# 在本地执行
scp -r ./dc-visualizer root@服务器IP:/opt/
```

### 步骤 3: 配置环境变量

```bash
cd /opt/dc-visualizer

# 复制配置文件
cp .env.example .env

# 编辑配置
nano .env
```

**.env 文件内容**:

```env
# 重要: 修改为随机字符串，可以用下面命令生成
# openssl rand -base64 32
JWT_SECRET=这里改成随机字符串

# 数据库路径（保持默认即可）
DATABASE_URL=file:/app/data/prod.db
```

### 步骤 4: 构建并启动

```bash
# 构建镜像（首次需要几分钟）
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f

# 按 Ctrl+C 退出日志
```

### 步骤 5: 验证部署

```bash
# 检查容器状态
docker compose ps

# 应该显示:
# NAME            STATUS          PORTS
# dc-visualizer   Up (healthy)    0.0.0.0:80->80/tcp
```

打开浏览器访问: `http://服务器IP`

---

## 🔧 常用命令

### 服务管理

```bash
# 启动服务
docker compose up -d

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 查看最近100行日志
docker compose logs --tail 100
```

### 数据管理

```bash
# 备份数据库
docker cp dc-visualizer:/app/data/prod.db ./backup-$(date +%Y%m%d).db

# 恢复数据库
docker cp ./backup.db dc-visualizer:/app/data/prod.db
docker compose restart
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 查看资源使用

```bash
# 查看容器资源
docker stats dc-visualizer
```

---

## 🔒 安全建议

### 1. 修改默认密码

首次登录后立即修改 admin 密码

### 2. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# CentOS
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload
```

### 3. 配置 HTTPS（可选）

使用 Caddy 反向代理自动获取 SSL 证书:

```bash
# 安装 Caddy
sudo apt install -y caddy

# 编辑配置
sudo nano /etc/caddy/Caddyfile
```

Caddyfile 内容:
```
your-domain.com {
    reverse_proxy localhost:80
}
```

```bash
# 重启 Caddy
sudo systemctl restart caddy
```

---

## 🐛 故障排查

### 问题1: 容器启动失败

```bash
# 查看详细日志
docker compose logs

# 检查端口占用
sudo netstat -tlnp | grep 80
```

### 问题2: 无法访问网页

```bash
# 检查容器状态
docker compose ps

# 检查防火墙
sudo ufw status

# 检查端口监听
curl localhost:80
```

### 问题3: 数据库错误

```bash
# 进入容器检查
docker exec -it dc-visualizer sh

# 检查数据库文件
ls -la /app/data/

# 重新初始化数据库
cd /app/api && npx prisma db push
```

### 问题4: 内存不足

```bash
# 查看内存使用
free -h

# 创建 swap 文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📞 技术支持

如有问题，请检查:
1. Docker 是否正常运行: `docker info`
2. 容器日志: `docker compose logs`
3. 服务器资源: `htop` 或 `docker stats`

---

## 📊 系统架构

```
┌─────────────────────────────────────────┐
│              客户端浏览器                │
└────────────────────┬────────────────────┘
                     │
                     ▼ HTTP:80
┌─────────────────────────────────────────┐
│              Docker 容器                 │
│  ┌───────────────────────────────────┐  │
│  │           Nginx                    │  │
│  │   (静态文件 + 反向代理)            │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  ▼ :3001                 │
│  ┌───────────────────────────────────┐  │
│  │        NestJS API                  │  │
│  │      (后端业务逻辑)                │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │      SQLite 数据库                 │  │
│  │    /app/data/prod.db              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────┐
          │  数据卷 (持久化) │
          │  dc-visualizer-  │
          │  data            │
          └─────────────────┘
```
