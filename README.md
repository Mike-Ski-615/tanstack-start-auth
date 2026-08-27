# TanStack Start Auth

基于 [TanStack Start](https://tanstack.com/start) 构建的全栈认证示例应用：注册、登录、登出、会话管理，以及受保护的用户仪表盘。

## 特性

- 🔐 **完整认证流程** —— 注册 / 登录 / 登出，基于服务端会话（session）
- 🛡️ **受保护路由** —— `_authenticated` 无路径布局路由统一拦截未登录访问（307 重定向到登录页）
- ⚡ **SSR + 流式 hydration** —— TanStack Start 服务端渲染，TanStack Query 查询状态流式同步到客户端
- 🗄️ **Prisma 8（契约优先）** —— TypeScript 定义数据契约，PostgreSQL 存储
- 🎨 **Tailwind CSS 4 + shadcn/ui** —— 现代化组件与主题（含暗色模式）

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | TanStack Start（React 19 + Vite 8） |
| 运行时 / 包管理 | Bun |
| 路由 / 数据 | TanStack Router、TanStack Query（SSR query streaming） |
| 数据库 | PostgreSQL ≥ 15 + Prisma 8（`@prisma/orm-postgres`） |
| 样式 | Tailwind CSS 4、shadcn/ui、sonner |

## 快速开始

### 前置要求

- [Bun](https://bun.com) ≥ 1.3
- PostgreSQL ≥ 15（本地或远程实例）

### 安装与配置

```bash
# 1. 安装依赖（postinstall 会自动执行 prisma skills sync）
bun install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 PostgreSQL 连接串：
# DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# 3. 生成 Prisma 契约产物并在数据库中创建表
bun prisma contract emit
bun prisma db init

# 4. 启动开发服务器（http://localhost:3000）
bun run dev
```

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `bun run dev` | 启动开发服务器（端口 3000） |
| `bun run build` | 生产构建 |
| `bun run start` | 预览生产构建 |
| `bun run contract:emit` | 修改 `src/prisma/contract.ts` 后重新生成契约（`contract.json` / `contract.d.ts`） |

## 项目结构

```
src/
├── routes/
│   ├── __root.tsx              # 根路由（布局、Toaster、主题）
│   ├── index.tsx               # 首页
│   ├── auth/                   # 登录 / 注册（公开）
│   ├── _authenticated.tsx      # 鉴权布局（pathless layout route）
│   └── _authenticated/
│       └── dashboard.tsx       # 受保护的仪表盘
├── server/                     # 服务端函数与认证逻辑
│   ├── auth/                   # 会话与鉴权中间件
│   ├── login.functions.ts
│   ├── register.functions.ts
│   └── logout.functions.ts
├── prisma/                     # Prisma 契约与生成产物
├── components/                 # UI 组件（shadcn/ui）
└── router.tsx                  # 路由与 QueryClient 装配
migrations/                     # Prisma 迁移记录与契约快照
```

## 路由说明

`_authenticated` 前缀的下划线表示 **pathless layout route**：该段只用于在路由树中包裹子路由做鉴权布局，**不会出现在 URL 中**。因此仪表盘的实际访问地址是：

```
http://localhost:3000/dashboard     ✅
http://localhost:3000/_authenticated/dashboard   ❌（不存在）
```

## Agent 配置

仓库内置了面向 AI 编码代理的配置（`.agents/`、`.claude/`、`.cursor/` 等目录下的 skills，以及 `docs/agents/` 下的 issue 追踪 / 领域文档约定）。Issue 追踪在 [GitHub Issues](https://github.com/Mike-Ski-615/tanstack-start-auth/issues)，详见 `docs/agents/issue-tracker.md`。
