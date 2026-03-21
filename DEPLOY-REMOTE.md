# DC-Visualizer 外网访问配置指南

## 📋 方案对比

| 方案 | 难度 | 费用 | 速度 | 推荐 |
|------|------|------|------|------|
| **Cloudflare Tunnel** | ⭐ | 免费 | 快 | ⭐⭐⭐ 首选 |
| frp 内网穿透 | ⭐⭐ | 需服务器 | 快 | 有云服务器时 |
| Tailscale | ⭐ | 免费 | 快 | 团队内部访问 |
| 花生壳/cpolar | ⭐ | 免费/付费 | 中 | 快速测试 |
| 公网IP + DDNS | ⭐⭐ | 免费 | 最快 | 有公网IP |

---

## ⭐ 方案一：Cloudflare Tunnel（强烈推荐）

**优点**：免费、安全、自带 HTTPS、速度快、稳定

### 步骤 1：注册 Cloudflare

1. 访问 https://dash.cloudflare.com/sign-up
2. 注册账号

### 步骤 2：添加域名（可选免费域名）

**如果你没有域名**，可以用免费域名：
- https://www.freenom.com （.tk/.ml/.ga 免费域名）
- 或者直接购买一个便宜域名（.com 约 ￥55/年）

**如果你有域名**：
1. 在 Cloudflare 添加你的域名
2. 按提示修改域名的 NS 记录指向 Cloudflare

### 步骤 3：安装 cloudflared

在 Mac mini 上执行：

```bash
# 安装 cloudflared
brew install cloudflared

# 登录 Cloudflare（会打开浏览器授权）
cloudflared tunnel login
```

### 步骤 4：创建隧道

```bash
# 创建隧道（名字自己取）
cloudflared tunnel create dc-visualizer

# 会显示隧道 ID，记下来
# Created tunnel dc-visualizer with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 步骤 5：配置隧道

```bash
# 创建配置文件
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

配置内容：

```yaml
tunnel: <你的隧道ID>
credentials-file: /Users/<你的用户名>/.cloudflared/<隧道ID>.json

ingress:
  - hostname: dc.你的域名.com
    service: http://localhost:80
  - service: http_status:404
```

### 步骤 6：配置 DNS

```bash
# 自动配置 DNS 记录
cloudflared tunnel route dns dc-visualizer dc.你的域名.com
```

### 步骤 7：启动隧道

```bash
# 测试运行
cloudflared tunnel run dc-visualizer

# 如果正常，配置开机自启
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

### 完成！

现在可以通过 `https://dc.你的域名.com` 从外网访问了！

---

## 方案二：Tailscale（团队内部访问）

**优点**：免费、简单、安全的私有网络

适合：只需要团队成员访问，不需要公开访问

### 步骤 1：注册 Tailscale

访问 https://tailscale.com 注册账号

### 步骤 2：Mac mini 安装 Tailscale

```bash
brew install tailscale
```

或者下载 App Store 版本

### 步骤 3：登录

```bash
sudo tailscaled
tailscale up
```

### 步骤 4：其他设备安装 Tailscale

在需要访问的手机/电脑上安装 Tailscale 并登录同一账号

### 步骤 5：访问

通过 Tailscale 分配的 IP 访问（如 `http://100.x.x.x`）

---

## 方案三：frp 内网穿透

**前提**：需要一台有公网 IP 的云服务器

### 服务端配置（云服务器）

```bash
# 下载 frp
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64

# 编辑服务端配置
cat > frps.toml << 'EOF'
bindPort = 7000
vhostHTTPPort = 80
vhostHTTPSPort = 443

auth.method = "token"
auth.token = "your-secret-token-change-this"
EOF

# 启动服务端
./frps -c frps.toml
```

### 客户端配置（Mac mini）

```bash
# 下载 frp (Mac ARM64 版本)
curl -LO https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_darwin_arm64.tar.gz
tar -xzf frp_0.52.3_darwin_arm64.tar.gz
cd frp_0.52.3_darwin_arm64

# 编辑客户端配置
cat > frpc.toml << 'EOF'
serverAddr = "你的云服务器IP"
serverPort = 7000

auth.method = "token"
auth.token = "your-secret-token-change-this"

[[proxies]]
name = "dc-visualizer"
type = "http"
localPort = 80
customDomains = ["dc.你的域名.com"]
EOF

# 启动客户端
./frpc -c frpc.toml
```

### 域名配置

将 `dc.你的域名.com` 解析到云服务器 IP

---

## 方案四：cpolar（快速测试）

**优点**：注册即用，5 分钟搞定
**缺点**：免费版域名随机，有带宽限制

```bash
# 安装
brew install cpolar

# 登录（需要先在 https://www.cpolar.com 注册）
cpolar authtoken <你的token>

# 启动隧道
cpolar http 80
```

会得到一个类似 `https://xxxxx.cpolar.io` 的地址

---

## 方案五：公网 IP + DDNS

**前提**：你的宽带有公网 IP（打电话给运营商要求开通）

### 检查是否有公网 IP

```bash
# 查看路由器 WAN 口 IP
# 然后访问 https://ip.sb 对比

# 如果两个 IP 一样，说明有公网 IP
```

### 配置 DDNS

1. 注册 DDNS 服务（如 dynv6.com、no-ip.com）
2. 在路由器中配置 DDNS
3. 路由器端口转发：外部 80 → Mac mini 内网IP:80

### 配置路由器端口转发

登录路由器后台，找到「端口转发」或「虚拟服务器」：
- 外部端口：80（或其他如 8080）
- 内部 IP：Mac mini 的内网 IP
- 内部端口：80

---

## 🔒 安全建议

无论使用哪种方案，都建议：

1. **修改默认密码** - 首次登录后立即修改 admin 密码
2. **使用 HTTPS** - Cloudflare Tunnel 自带，其他方案需配置证书
3. **定期备份** - 备份数据库文件
4. **访问日志** - 定期检查访问日志

---

## 推荐选择

| 你的情况 | 推荐方案 |
|---------|---------|
| 想最简单免费 | Cloudflare Tunnel |
| 只需团队内访问 | Tailscale |
| 有云服务器 | frp |
| 快速测试一下 | cpolar |
| 有公网IP | DDNS + 端口转发 |
