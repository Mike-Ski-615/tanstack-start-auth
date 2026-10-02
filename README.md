# TanStack Start Auth

基于 [TanStack Start](https://tanstack.com/start) 与 [better-auth](https://better-auth.com) 构建的全栈认证示例应用：注册、邮箱 OTP 验证、登录、登出、会话与密码重置。

## 特性

- 🔐 **认证由 better-auth 接管** —— 邮箱密码注册 / 登录 / 登出、会话、改密，全部走官方 API 与插件
- 📧 **6 位 OTP 邮箱验证与密码重置** —— better-auth `emailOTP` 插件（15 分钟有效、错 5 次作废、DB 存哈希）。邮件通过 **SMTP** 发送（`src/lib/auth/mail.ts`）
- ✅ **未验证不可登录** —— `requireEmailVerification: true`
- 🔑 **数据库会话** —— 会话落库（`session` 表，token 唯一），7 天过期
- ⏱️ **内存限流** —— better-auth 内置限流（`enabled: true`），单实例进程内、仅 production 生效
- 🧱 **受保护路由** —— `authenticated` 布局在 `beforeLoad` 用服务端 `getSessionFn` 拦截，未登录 `redirect` 到登录页
- 🗄️ **Prisma ORM 7 + PostgreSQL** —— `prisma-client` 生成到 `src/generated/prisma`，官方 better-auth Prisma 适配器
- 🎨 **Tailwind CSS 4 + shadcn/ui** —— 暗色模式与内容宽度切换

## 技术栈

| 类别               | 技术                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| 框架               | TanStack Start（React 19 + Vite 8）                                         |
| 运行时 / 包管理    | Bun                                                                         |
| 路由 / 数据 / 表单 | TanStack Router、TanStack Query、TanStack React Form                        |
| 数据库             | PostgreSQL ≥ 15 + Prisma ORM 7（`@prisma/adapter-pg`）                      |
| 认证               | better-auth 1.7（Prisma 适配器 + `emailOTP` 插件 + TanStack Start cookies） |
| 校验               | valibot                                                                     |
| 样式               | Tailwind CSS 4、shadcn/ui、sonner                                           |

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
#   DATABASE_URL       池化连接串（运行时）
#   DIRECT_URL         直连串（Prisma CLI 用）
#   BETTER_AUTH_SECRET 会话签名密钥
#   BETTER_AUTH_URL    站点地址（如 http://localhost:3000）

# 3. 生成 Prisma Client，并把 schema 同步到数据库
bun run db:generate
bun run db:push

# 4. 启动开发服务器（http://localhost:3000）
bun run dev
```

## 可用脚本

| 命令                  | 说明                                                     |
| --------------------- | -------------------------------------------------------- |
| `bun run dev`         | 启动开发服务器（端口 3000）                              |
| `bun run build`       | 生产构建                                                 |
| `bun run start`       | 预览生产构建                                             |
| `bun run typecheck`   | 类型检查                                                 |
| `bun run db:generate` | 修改 `src/prisma/schema.prisma` 后重新生成 Prisma Client |
| `bun run db:push`     | 把 schema 推送到数据库（开发用）                         |

## 测试

**当前没有测试。** 原有的全量集成测试已随测试能力一并移除。回归靠 `bun run typecheck` + 手动走一遍注册 / OTP 验证 / 登录 / 重置。

## 项目结构

```
src/
├── routes/
│   ├── __root.tsx              # 根路由（布局、Toaster、主题）
│   ├── index.tsx               # 首页
│   ├── auth.tsx                # /auth 布局壳（已登录则跳走）
│   ├── auth/                   # 登录 / 注册 / 忘记密码 / 重置 / 邮箱验证
│   ├── api/auth/$.ts           # better-auth handler（/api/auth/*）
│   ├── authenticated.tsx       # 鉴权布局（beforeLoad 拦截）
│   └── authenticated/          # 首页 + settings（home / account / profile / password）
├── server/
│   └── session.functions.ts    # getSessionFn：服务端读取 better-auth 会话
├── lib/
│   ├── auth.ts                 # better-auth 配置
│   ├── auth-client.ts          # 客户端 authClient（含 emailOTPClient）
│   ├── auth/
│   │   └── email/              # 每封验证码邮件一个自包含文件（SMTP + 模板 + 发送）
│   │       ├── register-email.ts        # email-verification
│   │       ├── sign-in-email.ts         # sign-in
│   │       └── reset-password-email.ts  # forget-password
│   └── utils.ts                # cn() 等
├── schemas/
│   └── auth.ts                 # valibot 表单校验
├── prisma/
│   ├── schema.prisma           # better-auth 的 user / session / account / verification
│   └── db.ts                   # PrismaClient（@prisma/adapter-pg）
├── generated/prisma/           # `prisma generate` 产物（已 gitignore）
├── provider/
│   ├── theme-provider.tsx      # 主题（暗色模式）
│   └── content-width-provider.tsx
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── header/ sidebar/        # 外壳
│   └── status/                 # 各路由的 loading / error / not-found
└── router.tsx                  # 路由与 QueryClient 装配
```

## 路由说明

`authenticated` 是路径段为 `/authenticated` 的布局路由：`beforeLoad` 做会话拦截，未登录跳登录页。

```
http://localhost:3000/authenticated                     ✅（登录后首页）
http://localhost:3000/authenticated/settings            ✅（弹窗式设置）
http://localhost:3000/auth/login                        ✅
http://localhost:3000/auth/register                     ✅
http://localhost:3000/auth/forgot-password              ✅
http://localhost:3000/auth/reset?email=...              ✅
http://localhost:3000/auth/verify-email?email=...       ✅
```

## 领域文档

- [`CONTEXT.md`](CONTEXT.md) 与 [`docs/adr/`](docs/adr/) 记录早期自研认证架构的术语与决策；当前认证已迁移到 better-auth，部分内容待更新。

## Agent 配置

仓库内置面向 AI 编码代理的配置（`.agents/`、`.claude/`、`.cursor/` 等目录，以及 `docs/agents/` 下的 issue 追踪 / 领域文档约定）。Issue 追踪在 [GitHub Issues](https://github.com/Mike-Ski-615/tanstack-start-auth/issues)，详见 `docs/agents/issue-tracker.md`。
