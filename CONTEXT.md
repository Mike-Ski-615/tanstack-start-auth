# CONTEXT

当前实现的领域术语与约定。历史决策与已废弃方案见 [`docs/adr/`](./docs/adr/)；
认证迁移的背景与取舍见 [ADR-0007](./docs/adr/0007-better-auth-migration.md)。

## 术语表

### 数据契约（`src/prisma/schema.prisma`）

Prisma ORM 7 的 schema，**只有 4 张表**，全部由 better-auth 定义：

| 模型 (`@@map`)                  | 作用                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `User` → `user`                 | 账号：id(uuid) / name / email / emailVerified / image / createdAt / updatedAt |
| `Session` → `session`           | 会话：id / token(unique) / expiresAt / ipAddress / userAgent / userId         |
| `Account` → `account`           | 凭据与第三方：accountId / providerId / userId / password…                     |
| `Verification` → `verification` | 一次性验证记录：identifier / value / expiresAt，OTP 存这里                    |

- `id` 由 better-auth `generateId: "uuid"` 生成（v4），列类型 `@db.Uuid`。
- `User.image` 带 DB 默认 `"/default-user.webp"`。
- 生成客户端输出到 `src/generated/prisma`（已 gitignore），改 schema 后 `bun run db:generate`。
- 本仓库**没有业务表**，也没有迁移文件：schema 用 `bun run db:push` 同步。

### 认证（better-auth）

`src/lib/auth.ts` 是唯一配置点。核心选择：

- `emailAndPassword.enabled` + `requireEmailVerification: true`：**未验证邮箱不能登录**。
- `minPasswordLength: 8`。
- 插件：`tanstackStartCookies()`（服务端 set-cookie）、`emailOTP(...)`。
- 会话 7 天过期，cookie 由 better-auth 管理（不再有自研 `session-token`）。

### Session（会话）

由 better-auth 承载：登录成功后写 `session` 表并设 HTTP-only cookie。校验走
`auth.api.getSession({ headers })`。

**多会话并存**：better-auth 默认不限制同一用户的并发会话。原自研实现的
「单设备在线 / 新登录踢旧设备 / `sessionVersion` 全局失效」**已删除**。

服务端读取会话只有一条路径：`src/server/session.functions.ts` 的
`getSessionFn`（`auth.api.getSession` + `getRequestHeaders()`）。路由守卫与页面
都从它（或其返回的 route context）取用户，不再有 `getUserFn` / `useSessionGuard`。

### Account（凭据）

邮箱密码的哈希存在 `account.password`（`providerId = "credential"`），而不是
`user` 表。改密走 `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })`。

### Verification 与 OTP

`verification` 表承载一次性记录。邮箱验证与密码重置都用 **6 位数字 OTP**
（`emailOTP` 插件）：

- `.otpLength: 6`、`expiresIn: 900`（15 分钟）、`allowedAttempts: 5`（错 5 次作废）。
- `.storeOTP: "hashed"`：库里存的是哈希，不是明文。
- `.resendStrategy: "rotate"`：重发即作废旧码。
- `sendVerificationOnSignUp: true`：注册后自动发送验证 OTP。
- `overrideDefaultEmailVerification: true`：邮箱验证用 OTP，而非邮件里的链接。

### enroll（注册开户）

注册 ≠ 登录：

1. `authClient.signUp.email({ name, email, password })` → 建 `user` + `account`，
   不签发会话；better-auth 自动发送验证 OTP（服务端日志可见）。
2. 跳 `/auth/verify-email?email=...`，输入 6 位码 →
   `authClient.emailOtp.verifyEmail({ email, otp })` → `user.emailVerified` 置真。
3. **验证不自动建会话**（better-auth 行为）：成功后前端跳 `/auth/login`，用户再登录。

### reset（密码重置）

忘记密码页提交邮箱 → `authClient.emailOtp.requestPasswordReset({ email })`
（恒返回成功，不暴露账号是否存在）→ 邮件收到 6 位码 → `/auth/reset?email=...`
输入验证码 + 新密码 → `authClient.emailOtp.resetPassword({ email, otp, password })`
→ 跳登录页。

### 限流

better-auth 内置限流：`rateLimit: { enabled: true }`。**内存存储**——进程内、重启
归零、不跨实例；因此不建 `rateLimit` 表。默认按 IP，**没有按 email 的维度**。

### 路由守卫与会话读取

- `src/routes/authenticated.tsx` 的 `beforeLoad` 调 `getSessionFn`；无会话 `redirect`
  到 `/auth/login`，有会话则把 `{ session }` 放进 route context 给子路由复用。
- 子页面（`authenticated/index.tsx`、`settings.tsx`、`settings/account.tsx`、
  `settings/profile.tsx`）用 `getRouteApi("/authenticated").useRouteContext()` 读会话，
  **不要**改用 `authClient.useSession()`——那会让首屏 SSR 拿不到用户数据。
- `src/routes/auth.tsx` 的 `beforeLoad` 反向：已登录访问 `/auth/*` 直接跳 `/authenticated`。
- `/api/auth/$` 是 better-auth 的 handler（GET/POST 都转发 `auth.handler`）。

### 错误码与本地化

better-auth 的错误响应形如 `{ code, message, originalMessage }`。中文由官方
`@better-auth/i18n` 插件在服务端完成翻译（`src/lib/auth.ts`），内置 `locales.zh`
覆盖 base 错误码，emailOTP 的 `INVALID_OTP` / `OTP_EXPIRED` / `TOO_MANY_ATTEMPTS`
在本项目里手动补齐（内置词表不含插件码）。

约定（对齐官方）：

- **控制流用 `code`**（与语言无关），例如登录回包里 `EMAIL_NOT_VERIFIED` 跳验证页。
- **展示用 `error.message`**（已被 i18n 翻好），客户端不再维护 code → 文案映射表。

### 邮件（`src/lib/auth/email/`）

每封验证码邮件一个**自包含**文件（SMTP 配置 + 传送器 + 模板 + 发送函数全在同一文件）：

- `register-email.ts` → `sendRegisterEmail()`，type `email-verification`
- `sign-in-email.ts` → `sendSignInEmail()`，type `sign-in`
- `reset-password-email.ts` → `sendResetPasswordEmail()`，type `forget-password`

`src/lib/auth.ts` 的 `sendVerificationOTP` 按 `type` 分派到对应的发送函数。
改主题/文案只需要编辑对应的那一个文件。

底层用 **SMTP**（nodemailer），环境变量在各文件内联读取：
`SMTP_HOST` / `SMTP_PORT`（默认 587）/ `SMTP_SECURE`（默认按端口推断：465 → true）/
`SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM`（默认取 `SMTP_USER`）。

- **只发送邮件，不把邮件内容打印到终端**；仅成功时记一行 messageId、
  失败时记 error。
- **唯一投递通道是 SMTP**：未配置 `SMTP_HOST` 或发送失败 → 抛错，
  不会用控制台打印冒充发送成功。

### 状态页与骨架（`components/status/`）

每个路由有自己的 loading / error / not-found，**完全定制、互不共用**；目录结构
镜像 `src/routes/`。两个容易踩的点：

1. **状态页会替换它服务的那个路由的组件**，所以页面那层包裹不在，状态页得自己带上。
   容器必须引用页面用的同一组常数（`content-width-provider` 的
   `SIDEBAR_GUTTER_CLASS` / `CONTENT_WIDTH_CLASS`），不能抄字面值——抄了会出现
   「加载/出错时全宽、正常时居中」的跳动，而且**不报错**。
2. **不是所有骨架都会被看到**。当前只有 `auth` 与 `authenticated` 两个布局路由的
   `beforeLoad` 是异步的（`getSessionFn`），其余页面的 `pendingComponent` 基本
   不可达（设置弹窗由 Radix portal 客户端渲染，也不参与 SSR 骨架）。按约定保留即可。

> **测试代码已全部移除**。约定现在只靠 review，自动闸只有三道：`typecheck`、
> `knip`、`lint-staged`(prettier)——它们都抓不住行为回归。

### 安全审计状态

| 模块                | 状态     | 备注                                                                      |
| ------------------- | -------- | ------------------------------------------------------------------------- |
| 邮箱验证硬门槛      | PASS     | `requireEmailVerification: true`，未验证登录返回 `EMAIL_NOT_VERIFIED`     |
| OTP 存储            | PASS     | `storeOTP: "hashed"`，库里不含明文                                        |
| OTP 尝试上限        | PASS     | `allowedAttempts: 5`，超限作废并需重发                                    |
| OTP 重发            | PASS     | `resendStrategy: "rotate"`，旧码立即失效                                  |
| 密码哈希            | PASS     | better-auth 默认（scrypt）；不再自研 Argon2                               |
| 密码下限            | PASS     | 服务端 `minPasswordLength: 8` + 客户端 valibot 同值                       |
| 登录防枚举          | **削弱** | better-auth 默认对不存在邮箱/错密码返回同码，但**注册重复邮箱会明确报错** |
| 限流                | **削弱** | 内存、单实例、仅 IP 维度（原按 email + IP 的 DB 限流已删除）              |
| 单设备在线          | **移除** | 改为 better-auth 默认多会话                                               |
| 角色 / 管理接口准入 | **移除** | 角色与后台整体删除，应用现在没有服务端权限边界                            |
| CSRF                | PASS     | better-auth 校验 Origin（curl 不带 Origin 会被拒）                        |
| 回归网              | **无**   | 只能 typecheck + 手点；无行为回归保护                                     |

### 已移除概念（不要再去代码里找）

`Device` / `deviceKey`、`sessionVersion` / `invalidateAllSessions`、
`ResetToken` / `EmailVerificationToken` 表、`RateLimit` 表、`Role` / `ROLE_HOME` /
`MANAGED_ROLES` / `NAV_BY_ROLE`、`LoginEvent` / 活动热力图、`Notification` /
`NotificationRecipient` / 未读铃铛、`bio`、`notifyOnNewMessage`、
`useSessionGuard`、自研 Argon2 密码模块、Prisma Next 契约（`contract.json` /
`schema.d.ts` / `migrations/app/*`）。

### TODO

1. **邮件需配置 SMTP** —— 未设 `SMTP_HOST` 时只打控制台；生产必须配置
   `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` 与发件地址 `EMAIL_FROM`。
2. **限流不够** —— 若要防按邮箱的撞库 / 多实例部署，需改 better-auth
   `rateLimit.storage: "database"`（加回 `rateLimit` 表）或外接存储。
3. **没有业务表** —— 通知、活动等能力若要恢复，需要重新设计并加回 schema。
4. **服务端无权限边界** —— 所有登录用户等价；要分权需重新引入角色与准入检查。
