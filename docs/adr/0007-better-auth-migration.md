# ADR-0007: 认证迁移到 better-auth，数据层迁移到 Prisma ORM 7

**Status**: 已接受（2026-10）

## 背景

原认证是自研深模块：Argon2id 密码、`Session` 表 + SHA-256 令牌、单设备模型
（`Device` + `sessionVersion` 全局失效）、自研 OTP 表（`ResetToken` /
`EmailVerificationToken`）、DB 滑动窗口限流（`RateLimit`）、角色体系（student /
teacher / admin）、管理后台、通知收发、`LoginEvent` 活动统计。维护成本高，且
每一块都在重复更好的库已有的能力。

数据层此前是 Prisma Next 8（contract-first：`contract.prisma` → `contract.json` /
`contract.d.ts`，`migrations/app/*`）。

## 决策

### 1. 数据层：弃用 Prisma Next，改用 Prisma ORM 7

- `prisma@7.10` + `@prisma/client@7.10` + `@prisma/adapter-pg`；generator 用
  `prisma-client`，输出 `src/generated/prisma`（gitignore）。
- `prisma.config.ts` 用 `defineConfig({ schema, datasource: { url: env("DIRECT_URL") } })`。
- 运行时走池化 `DATABASE_URL`（`PrismaPg`），CLI（`db push`）走 Neon 直连 `DIRECT_URL`。
- **无迁移文件**，用 `prisma db push`；本次以 `--force-reset` 清库重建（dev 库，
  用户明确同意）。

### 2. 认证：better-auth 1.7 + 官方 Prisma 适配器

- `betterAuth({ database: prismaAdapter(prisma, { provider: "postgresql" }) })`。
- schema 仅保留官方最小 4 表：`user` / `session` / `account` / `verification`
  （由 `npx auth@latest generate` 生成，`@@map` 到小写表名）。
- `advanced.database.generateId: "uuid"`（v4），`joins: true`。

### 3. 流程与参数

- `requireEmailVerification: true`（未验证不能登录）、`minPasswordLength: 8`。
- `emailOTP` 插件：6 位、900 秒、错 5 次作废、`storeOTP: "hashed"`、
  `resendStrategy: "rotate"`、`overrideDefaultEmailVerification: true`、
  `sendVerificationOnSignUp: true`；邮箱验证与密码重置都走它。
- 限流：better-auth 内置、**内存存储**（`rateLimit: { enabled: true }`），
  因此不建 `rateLimit` 表。

### 4. 删除的整套功能

强制单设备会话、角色与 `ROLE_HOME`、管理后台（教师/学生管理、发通知）、资料简介
`bio`、通知偏好 `notifyOnNewMessage` 与通知（含顶栏铃铛、历史、未读）、活动统计
`LoginEvent`/热力图、帮助页、隐私与安全页、用户资料页
`/authenticated/users/$userId`。

## 后果

- **单一 ORM + 官方适配器**：不再有自研适配器，schema 只剩 4 张官方表。
- **多会话并存**：better-auth 默认不限制并发会话，原「新登录踢旧设备」不再存在。
- **`verifyEmail` 不自动建会话**：验证成功后前端跳登录页，由用户再登录。
- **限流是进程内的**：重启归零、不跨实例、默认仅 production 生效；且只有 IP 维度，
  原「按 email 限流」的防撞库维度丢失。
- **`src/lib/auth/mail.ts`**：迁移当时仍是 `console.log`；后续已接入 **SMTP（nodemailer）**（见 CONTEXT.md）。
- 历史 ADR 0001–0006 全部过时（0005 的 6 位 OTP 做法保留）。

## 考虑过的替代方案

- **自研 better-auth 适配器落在 Prisma Next 上**：否决 —— 新增长期维护面，且官方
  不提供 Prisma Next 适配器。
- **侧车 Prisma ORM（双 ORM）**：否决 —— 两套 schema / 迁移 / 连接池 / CLI 冲突。
- **保留角色但迁移到 better-auth**：否决 —— 用户选择精简为单角色应用。
