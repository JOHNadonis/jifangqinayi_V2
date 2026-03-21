# DC-Visualizer 机房搬迁可视化管理系统

一个轻量级、可视化的机房资产与连线管理系统，确保机房搬迁 **0失误**。

## 技术栈

- **前端**: React 18 + TypeScript + AntV X6 + Ant Design 5
- **后端**: Node.js + NestJS + Prisma ORM
- **数据库**: PostgreSQL
- **移动端**: PWA (离线优先)

## 项目结构

```
dc-visualizer/
├── apps/
│   ├── api/          # NestJS 后端
│   └── web/          # React 前端
├── packages/
│   └── shared/       # 共享类型定义
└── package.json      # Monorepo 配置
```

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置数据库

复制环境变量配置文件:

```bash
cp apps/api/.env.example apps/api/.env
```

编辑 `apps/api/.env`，配置数据库连接:

```
DATABASE_URL="postgresql://用户名:密码@localhost:5432/dc_visualizer?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. 初始化数据库

```bash
# 生成 Prisma Client
pnpm db:generate

# 推送数据库结构
pnpm db:push

# 播种测试数据
pnpm db:seed
```

### 4. 启动开发服务器

```bash
# 同时启动前后端
pnpm dev

# 或分别启动
pnpm dev:api   # 后端 http://localhost:3001
pnpm dev:web   # 前端 http://localhost:5173
```

### 5. 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:3001/api
- API 文档: http://localhost:3001/api/docs

**测试账号:**
- 管理员: admin / admin123
- 工程师: engineer / user123

## 功能模块

### 1. 智能设备指纹库
- 预置主流厂商设备模板
- 自定义端口布局

### 2. 可视化机房
- 机柜 42U 可视化视图
- 设备状态着色
- 拖拽上架

### 3. 连线管理
- 端口级连线记录
- 自动生成追溯码
- 标签导出

### 4. 拓扑图
- 自动生成网络拓扑
- 聚焦模式高亮
- 导出 PNG

### 5. 移动端 PWA
- 离线优先
- 扫码查询
- 快速录入
- 接线引导

### 6. 数据导出
- 全量 Excel 导出
- 标签 Excel 导出

## API 端点

| 模块 | 端点 | 说明 |
|------|------|------|
| 认证 | POST /api/auth/login | 登录 |
| 机房 | /api/rooms | 机房 CRUD |
| 机柜 | /api/racks | 机柜 CRUD |
| 模板 | /api/templates | 设备模板 CRUD |
| 设备 | /api/devices | 设备 CRUD |
| 连线 | /api/cables | 连线 CRUD |
| 拓扑 | /api/topology/room/:id | 获取拓扑 |
| 导出 | /api/export/excel | 导出 Excel |
| 同步 | /api/sync | 离线同步 |

## 开发命令

```bash
# 开发
pnpm dev           # 启动所有服务
pnpm dev:api       # 仅启动后端
pnpm dev:web       # 仅启动前端

# 数据库
pnpm db:generate   # 生成 Prisma Client
pnpm db:push       # 推送结构到数据库
pnpm db:migrate    # 创建迁移
pnpm db:seed       # 播种数据
pnpm db:studio     # 打开 Prisma Studio

# 构建
pnpm build         # 构建所有
pnpm build:api     # 构建后端
pnpm build:web     # 构建前端
```

## License

MIT
