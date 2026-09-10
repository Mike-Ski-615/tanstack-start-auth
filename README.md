# TanStack Start Auth

基于 [TanStack Start](https://tanstack.com/start) 构建的全栈认证示例应用：注册、登录、登出、会话管理，以及受保护的用户仪表盘。

## 特性

- 🔐 **完整认证流程** —— 注册 / 登录 / 登出 / 邮箱验证 / 密码重置，单设备在线（新登录踢掉旧会话）
- 🔑 **有状态会话** —— 会话令牌落库（Session 表只存 SHA-256 哈希，明文仅在 HTTP-only cookie），7 天过期。`sessionVersion` 递增即可全局失效，支持「撤销全部会话」
- 🔄 **密码重置** —— 随机令牌 + 落库哈希 + 单条 SQL 原子消费（15 分钟有效）；请求入口防账号枚举（恒返回同一响应）；重置成功即自动登录。邮件当前输出到控制台（`src/lib/auth/mail.ts`）
- 🛡️ **防枚举登录** —— 用户不存在时仍执行等价的 Argon2 校验，消除响应时间差异
- ⚡ **实时在线状态** —— Nitro WebSocket（crossws）驱动 Presence；会话被替换/撤销时主动踢下线（关闭码 4001 / 4002）
- 🧱 **受保护路由** —— `authenticated` 无路径布局路由在 `beforeLoad` 用 `getUserFn` 拦截，未登录 `redirect` 到登录页
- 🗄️ **Prisma 8（契约优先）** —— TypeScript 定义数据契约，PostgreSQL 存储
- 🎨 **Tailwind CSS 4 + shadcn/ui** —— 现代化组件与主题（含暗色模式）

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | TanStack Start（React 19 + Vite 8） |
| 运行时 / 包管理 | Bun |
| 路由 / 数据 / 表单 | TanStack Router、TanStack Query（SSR query streaming）、TanStack React Form |
| 数据库 | PostgreSQL ≥ 15 + Prisma 8（`@prisma/orm-postgres`） |
| 会话 / 令牌 | 落库会话（Session 表存 SHA-256 哈希）+ 随机重置令牌（`node:crypto`） |
| 实时 | Nitro WebSocket（crossws）、原生 WebSocket 客户端 |
| 密码 | Argon2id（`hash-wasm`） |
| 校验 | zod |
| 样式 | Tailwind CSS 4、shadcn/ui、sonner |

## 快速开始

### 前置要求

- [Bun](https://bun.com) ≥ 1.3
- PostgreSQL ≥ 15（本地或远程实例）

### 安装与配置

```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入：
#   DATABASE_URL   PostgreSQL 连接串
#   APP_URL        站点对外地址，用于拼密码重置邮件链接（如 http://localhost:3000）

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
│   ├── index.tsx               # 首页（中性落地页）
│   ├── auth.tsx                # /auth 布局壳
│   ├── auth/                   # 登录 / 注册 / 忘记密码 / 重置 / 邮箱验证（公开）
│   ├── authenticated.tsx       # 鉴权布局（pathless layout route，beforeLoad 拦截）
│   └── authenticated/          # 受保护页面（teacher / student / settings / users/$userId）
├── server/                     # 服务端函数（各用例逻辑内联于 handler，失败以 throw 表达）
│   ├── login.functions.ts
│   ├── register.functions.ts
│   ├── logout.functions.ts
│   ├── reset.functions.ts
│   ├── profile.functions.ts
│   ├── sessions.functions.ts
│   ├── email-verification.functions.ts
│   └── user.functions.ts       # getUserFn：当前用户唯一公开形态（查询源头投影）
├── lib/
│   ├── auth/                   # 认证深模块（会话 / 令牌 / 限速 / 守卫 / WS 注册表）
│   │   ├── session.ts          # 会话 cookie 读写
│   │   ├── session-manager.ts  # Session 创建 / 失效 / 重置令牌
│   │   ├── token.ts            # 随机令牌生成与 SHA-256 哈希
│   │   ├── password.ts         # Argon2id 哈希 / 校验
│   │   ├── rate-limiter.ts     # 滑动窗口限速（DB 承载）
│   │   └── ws-registry.ts      # WS 连接内存注册表（kick / presence）
│   ├── format.ts               # 通用格式化
│   └── utils.ts                # cn() 等
├── schemas/
│   └── auth.ts                 # zod 校验 schema（登录 / 注册 / 重置 / 邮箱验证）
├── websocket/
│   └── routes/ws.ts            # Nitro WebSocket 处理器（/ws）
├── prisma/                     # Prisma 契约与生成产物（contract.ts / contract.json / contract.d.ts / db.ts）
├── provider/
│   └── theme-provider.tsx      # 主题（暗色模式）
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   └── status/                 # 各路由的 loading / error / not-found 页面
└── router.tsx                  # 路由与 QueryClient 装配
migrations/                     # Prisma 迁移记录与契约快照
```

## 路由说明

`authenticated` 前缀的下划线表示 **pathless layout route**：该段只用于在路由树中包裹子路由做鉴权布局，**不会出现在 URL 中**。实际地址示例：

```
http://localhost:3000/authenticated/student     ✅
http://localhost:3000/authenticated/settings    ✅
http://localhost:3000/authenticated             ❌（重定向到角色首页）
```

同理，`auth.tsx` 是带路径段 `/auth` 的布局路由，仅承载登录 / 注册 / 重置等子页面：

```
http://localhost:3000/auth/login        ✅
http://localhost:3000/auth/register     ✅
http://localhost:3000/auth/forgot-password  ✅
http://localhost:3000/auth/reset        ✅（需带 ?token=...）
http://localhost:3000/auth/verify-email ✅（需带 ?token=...）
```

## 领域文档

术语与设计决策集中在 [`CONTEXT.md`](CONTEXT.md) 和 [`docs/adr/`](docs/adr/)：

- [`docs/adr/0001-reset-implies-verification.md`](docs/adr/0001-reset-implies-verification.md) —— 密码重置蕴含邮箱验证
- [`docs/adr/0002-remove-email-verification.md`](docs/adr/0002-remove-email-verification.md) —— 移除邮箱验证，注册即登录（0001 随之失去意义）

## Agent 配置

仓库内置了面向 AI 编码代理的配置（`.agents/`、`.claude/`、`.cursor/` 等目录下的 skills，以及 `docs/agents/` 下的 issue 追踪 / 领域文档约定）。Issue 追踪在 [GitHub Issues](https://github.com/Mike-Ski-615/tanstack-start-auth/issues)，详见 `docs/agents/issue-tracker.md`。
