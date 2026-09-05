# TanStack Start Auth

基于 [TanStack Start](https://tanstack.com/start) 构建的全栈认证示例应用：注册、登录、登出、会话管理，以及受保护的用户仪表盘。

## 特性

- 🔐 **完整认证流程** —— 注册 / 登录 / 登出，**注册即登录**（注册成功即签发会话）。邮箱验证已移除（见 [`docs/adr/0002-remove-email-verification.md`](docs/adr/0002-remove-email-verification.md)）
- 🔑 **无状态会话** —— 会话是加密后存放在 HTTP-only cookie 的 `userId`（iron-session 风格），**服务端不落库**；7 天过期。已知取舍：旧 cookie 在自然过期前**无法服务端撤销**（见 `src/lib/session.ts`）
- 🔄 **密码重置** —— 无状态 HMAC 签名令牌（HS256 JWT，`{ sub, exp }`，15 分钟有效，不落库）；请求入口防账号枚举（恒返回同一响应）；重置成功即自动登录。邮件当前输出到控制台（`src/lib/mail.ts`）
- 🛡️ **受保护路由** —— `_authenticated` 无路径布局路由在 `beforeLoad` 用 `getUserFn` 拦截，未登录 `redirect` 到登录页
- ⚡ **SSR + 流式 hydration** —— TanStack Start 服务端渲染，TanStack Query 查询状态流式同步到客户端
- 🗄️ **Prisma 8（契约优先）** —— TypeScript 定义数据契约，PostgreSQL 存储
- 🎨 **Tailwind CSS 4 + shadcn/ui** —— 现代化组件与主题（含暗色模式）

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | TanStack Start（React 19 + Vite 8） |
| 运行时 / 包管理 | Bun |
| 路由 / 数据 / 表单 | TanStack Router、TanStack Query（SSR query streaming）、TanStack React Form |
| 数据库 | PostgreSQL ≥ 15 + Prisma 8（`@prisma/orm-postgres`） |
| 会话 / 令牌 | 无状态加密 cookie（`useSession`）+ HMAC JWT（`jose`，复用 `SESSION_SECRET`） |
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
#   SESSION_SECRET 至少 32 字符的随机串（会话加密 + 令牌签名的密钥）
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
| `bun test` | 运行测试（`session.test.ts` 需 `SESSION_SECRET`；其余集成测试需 `TEST_DATABASE_URL`，缺失时自动跳过） |
| `bun run contract:emit` | 修改 `src/prisma/contract.ts` 后重新生成契约（`contract.json` / `contract.d.ts`） |

## 测试

测试文件位于 `test/` 目录：

- `test/server-fn.ts` —— 测试助手：`mock.module` 拦截 `createServerFn`，让 bun 测试能在最小请求上下文（`__executeServer` + `runWithStartContext`）中直调 server function，等价于真实请求路径
- `test/session.test.ts` —— 会话模块集成测试（无状态 cookie 的 write/read/clear 与篡改防护），**无数据库依赖**，门控为 `SESSION_SECRET`
- `test/use-cases.test.ts` —— 登录 / 注册 / 登出用例集成测试，需 `TEST_DATABASE_URL`
- `test/current-user.test.ts` —— `getUserFn` 集成测试：公开形态投影（`passwordHash` 永不外泄）+ 无会话/篡改/用户不存在返回 `null`，需 `TEST_DATABASE_URL`
- `test/reset.test.ts` —— 密码重置集成测试（从邮件正文捕获重置链接、验签、改密、自动登录），需 `TEST_DATABASE_URL`

配置集成测试库（一次性）：

```bash
# 创建独立测试库（勿用开发库）并初始化表结构
createdb tanstack_auth_test   # 或 psql -c "CREATE DATABASE tanstack_auth_test"
DATABASE_URL="postgresql://user:password@localhost:5432/tanstack_auth_test" bun prisma db init

# 在 .env 中追加（或运行时传入）：
# TEST_DATABASE_URL="postgresql://user:password@localhost:5432/tanstack_auth_test"
```

## 项目结构

```
src/
├── routes/
│   ├── __root.tsx              # 根路由（布局、Toaster、主题）
│   ├── index.tsx               # 首页（中性落地页）
│   ├── auth.tsx                # /auth 布局壳（居中 + 宽度，不含内容）
│   ├── auth/                   # 登录 / 注册 / 忘记密码 / 重置密码（公开）
│   ├── _authenticated.tsx      # 鉴权布局（pathless layout route，beforeLoad 拦截）
│   └── _authenticated/
│       └── dashboard.tsx       # 受保护的仪表盘
├── server/                     # 服务端函数（各用例逻辑内联于 handler，失败以 throw 表达）
│   ├── login.functions.ts
│   ├── register.functions.ts
│   ├── logout.functions.ts
│   ├── reset.functions.ts
│   └── user.functions.ts       # getUserFn：当前用户唯一公开形态（查询源头投影）
├── lib/                        # 通用深模块
│   ├── session.ts              # 无状态会话（加密 cookie，useAppSession）
│   ├── jwt.ts                  # 无状态用户令牌（HS256 签发/验签）
│   ├── password.ts             # Argon2id 哈希/校验
│   ├── mail.ts                 # 邮件发送（当前控制台输出，接 SMTP 只改这里）
│   └── utils.ts
├── schemas/
│   └── auth.ts                 # zod 校验 schema（登录/注册/重置）
├── prisma/                     # Prisma 契约与生成产物（contract.ts / contract.json / contract.d.ts / db.ts）
├── provider/
│   └── theme-provider.tsx      # 主题（暗色模式）
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   └── status/                 # 各路由的 loading / error / not-found 页面
└── router.tsx                  # 路由与 QueryClient 装配
migrations/                     # Prisma 迁移记录与契约快照
docs/
├── adr/                        # 架构决策记录（0001 重置蕴含验证 / 0002 移除邮箱验证）
└── agents/                     # issue 追踪 / 领域文档约定
CONTEXT.md                      # 领域术语表（Session / enroll / CurrentUser / Reset Token / reset）
```

## 路由说明

`_authenticated` 前缀的下划线表示 **pathless layout route**：该段只用于在路由树中包裹子路由做鉴权布局，**不会出现在 URL 中**。因此仪表盘的实际访问地址是：

```
http://localhost:3000/dashboard     ✅
http://localhost:3000/_authenticated/dashboard   ❌（不存在）
```

同理，`auth.tsx` 是带路径段 `/auth` 的布局路由，仅承载登录 / 注册 / 重置等子页面：

```
http://localhost:3000/auth/login        ✅
http://localhost:3000/auth/register     ✅
http://localhost:3000/auth/forgot-password  ✅
http://localhost:3000/auth/reset        ✅（需带 ?token=...）
```

## 领域文档

术语与设计决策集中在 [`CONTEXT.md`](CONTEXT.md) 和 [`docs/adr/`](docs/adr/)：

- [`docs/adr/0001-reset-implies-verification.md`](docs/adr/0001-reset-implies-verification.md) —— 密码重置蕴含邮箱验证
- [`docs/adr/0002-remove-email-verification.md`](docs/adr/0002-remove-email-verification.md) —— 移除邮箱验证，注册即登录（0001 随之失去意义）

## Agent 配置

仓库内置了面向 AI 编码代理的配置（`.agents/`、`.claude/`、`.cursor/` 等目录下的 skills，以及 `docs/agents/` 下的 issue 追踪 / 领域文档约定）。Issue 追踪在 [GitHub Issues](https://github.com/Mike-Ski-615/tanstack-start-auth/issues)，详见 `docs/agents/issue-tracker.md`。
