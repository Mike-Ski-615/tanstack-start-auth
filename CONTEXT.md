# CONTEXT

## 术语表

### Session（会话）

User 的登录态，DB 承载：cookie 仅存不透明令牌（session-token，32 字节随机串 hex），
服务端 Session 表存 SHA-256(令牌) + deviceId + sessionVersion + userAgent + ip + expiresAt + revokedAt。7 天过期。

**单设备在线**：Device.userId UNIQUE 保证一用户一设备，Session.userId UNIQUE 保证一用户一会话。
新设备登录时删除旧 Device + 旧 Session，创建新 Device + 新 Session。

**会话可服务端撤销**：登出写 revokedAt；改密/撤销全部时递增 User.sessionVersion，所有旧 Session 全局失效。

### Device（设备）

用户设备的稳定标识。DB 承载：deviceKey（服务端生成的 256-bit base64url 随机串）+ platform（web/android/ios/desktop）+ name（UA 解析）+ userAgent + ip + lastSeenAt。

- deviceKey 通过 Cookie（device_key）持久化，客户端自动携带
- 同设备复用（deviceKey 匹配），不同设备自动替换（仅删除旧 Device，不管 Session）
- lastSeenAt 带 5 分钟节流，避免每次请求写 DB
- 职责边界：ensureDevice() 只管 Device，Session 生命周期由 session-manager.ts 负责

**认证关系**：

```
User (1) ──→ (1) Device (1) ──→ (1) Session
```

### enroll（注册开户）

认证用例之一：注册 ≠ 登录。
建用户 → 创建邮箱验证 OTP（旧 OTP 作废）→ 发验证码邮件 → 跳 `/auth/verify-email?email=...`。
用户输入 6 位验证码 → verifyEmailFn → 消费 OTP + 写 User.emailVerifiedAt → signIn（建会话 + 设 cookie）→ 自动登录。
注册不证明邮箱所有权，需用户输入验证码完成验证。
并发竞态由数据库唯一约束兜底。

### CurrentUser（当前用户）

面向服务与客户端的用户唯一公开形态。字段清单**以 `src/lib/auth/current-user.ts` 的
`PUBLIC_COLUMNS` 为准**（目前 9 个：id, email, name, image, bio, role, createdAt,
sessionVersion, emailVerifiedAt）；passwordHash 等存储层字段不进入查询结果。

> `User.status` 字段已删除。在线状态曾由它承载，与 WS 内存注册表形成双真源，
> 注册表丢失时会永久留下错误的 online。WS 移除后该字段失去用途。

`id` 是原生 uuid 列，读出来就是普通 `string`（无品牌类型），从 ORM 一路贯穿到客户端
路由 context，无需转换 —— 见 ADR-0003。

投影发生在 `validateSession`（`include("user", u => u.select(...PUBLIC_COLUMNS))`），
guard 只做转发。理由：会话校验反正要读 User 比对 sessionVersion，顺带返回即可，
避免同一请求重复查库。

### ResetToken（重置 OTP）

DB 承载：ResetToken 表存 SHA-256(6 位数字) + userId + attempts + expiresAt + usedAt。
15 分钟有效，一次性（usedAt 标记已使用），单个 OTP 错 5 次即作废。

使用流程：用户在忘记密码页提交邮箱 → 邮件收到 6 位验证码 → 在
`/auth/reset?email=...` 页输入验证码 + 新密码 → 重置成功并自动登录。

**为何用 6 位数字而非 URL 里的长令牌**：用户不用切回邮件点链接，直接在页面上
输入。代价是熵从 256-bit 降到 20-bit（100 万种），补偿手段是错误次数上限 +
双维度限速（见 RateLimit）。**这两个补偿缺一不可** —— 没有它们，6 位数字
几分钟就能被脚本撞开。

### EmailVerificationToken（邮箱验证 OTP）

DB 承载：EmailVerificationToken 表存 SHA-256(6 位数字) + userId + attempts +
expiresAt + verifiedAt。15 分钟有效，一次性（verifiedAt 标记已验证），
单个 OTP 错 5 次即作废。

使用流程：注册后跳 `/auth/verify-email?email=...` → 邮件收到 6 位验证码 →
在页面输入 → 验证成功即创建 Session（自动登录）。验证通过同时写
`User.emailVerifiedAt`（账户级状态）。

### sessionVersion（会话版本）

User 级别的整数计数器，用于全局会话失效。

- 注册：不递增
- 普通登录：不递增（旧 Session 已被删除）
- 改密：递增
- 重置密码：递增
- 撤销全部会话：递增

校验：`Session.sessionVersion === User.sessionVersion`，不匹配则 Session 失效。

> 递增为**单条原子 UPDATE**（`SET "sessionVersion" = "sessionVersion" + 1`），
> 不存在 read-modify-write 竞争。实现细节见 ADR-0004。

### reset（密码重置）

认证用例之一：验证 OTP → 改密 → 递增 sessionVersion → signIn（自动登录）。
OTP 校验在服务端有副作用（写 usedAt / attempts），改密前旧会话全部失效。
请求入口防账号枚举：无论邮箱是否存在，恒返回同一响应。

注意：重置**不**写 `User.emailVerifiedAt`（ADR-0001 已废弃，当前行为是不碰）。
「能收到重置邮件是否等于证明邮箱归属」仍是一个未决问题。

### 核心原语

认证模块的两个核心操作，所有认证用例基于它们组合：

1. **createAuthenticatedSession(userId, deviceKey?, userAgent?, ip?)** → `{ token, deviceKey }`
   - 确保 Device（单设备冲突时自动替换）
   - 删除旧 Session
   - 创建新 Session（带 sessionVersion）
   - 返回原始 token + deviceKey（需设 cookie）

2. **invalidateAllSessions(userId)** → `void`
   - 递增 User.sessionVersion → 所有旧 Session 全局失效
   - 用于改密、重置密码、撤销全部会话

### RateLimit（速率限制）

DB 承载：RateLimit 表存 key（类型:标识符）+ count + windowStart + expiresAt。
滑动窗口：1 分钟窗口，登录 5 次/分钟（email+IP），注册 3 次/分钟（IP），
重置请求 3 次/分钟（IP），重发邮件 3 次/分钟（IP + email 双维度），
邮箱 OTP 验证 10 次/分钟（email+IP），重置 OTP 验证 10 次/分钟（email+IP）。
窗口过期时重置计数（upsert 复用行），而非逐条清理。`purgeExpiredRateLimit()` 清理过期行。

### Fail-Closed 顺序

无多语句 transaction 前提下，安全敏感操作采用 fail-closed 顺序，**已由
`lib/auth/password-rotation.ts` 的 `rotatePassword()` 强制**：

```
1. invalidateAllSessions(userId)   ← 失败则中止，密码不动
2. update passwordHash
3. signIn(userId)                  ← 用递增后的 sessionVersion 建新会话
```

改密（已登录，验当前密码）与重置（未登录，验 OTP）两条路径的前置校验
完全不同，但尾部这三步相同 —— 各自只做前置部分，尾部都调 `rotatePassword`。

若 invalidate 失败，密码不被修改（用户被登出但密码安全）。反过来（先改密码
再失效）会出现「密码已换、旧会话仍有效」的窗口，攻击者持有的旧 token 还能用。

> 这个约束以前只写在本文件里、两个调用点各自照做；现在代码是单一来源，
> 本节只作索引。

### 会话失效检测（客户端）

服务端没有主动推送下线的能力（WebSocket 已移除）。客户端靠 `useSessionGuard`
轮询 `getUserFn`（30 秒 + 切回标签页立即检查）：会话在服务端失效后该接口
返回 null，遂提示并跳登录页。这是有意的取舍 —— 从「即时下线」退到
「最迟 30 秒」，换掉一整套连接注册表、心跳与重连逻辑。

### 概念分离

| 概念             | 存储位置               | 职责                               | 生命周期          |
| ---------------- | ---------------------- | ---------------------------------- | ----------------- |
| `deviceKey`      | Cookie + Device 表     | 设备身份标识（≠ 认证凭证）         | 长期（> Session） |
| `session-token`  | Cookie + Session 表    | 认证凭证                           | 7 天              |
| `sessionVersion` | User 表                | 全局会话失效开关                   | 随 User 永久      |
| 邮箱验证 OTP     | EmailVerificationToken | 证明邮箱归属的一次性凭证           | 15 分钟           |
| 重置 OTP         | ResetToken             | 证明邮箱归属、允许改密的一次性凭证 | 15 分钟           |

三个 cookie：`session-token`（认证）、`device_key`（设备身份）、以及
TanStack 自己的服务端函数上下文 cookie。后两者都不是凭证。

### 架构模型

```
User
 ├── sessionVersion          ← 递增即全局失效
 └── Device (1:1) ──── deviceKey = 设备身份标识
       └── Session (1:1) ──── session-token = 认证凭证
```

### 安全审计状态

| 模块                     | 状态     | 备注                                                                                                                            |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| OTP 消费规则             | PASS     | 两条流程共用 `otp-store.consumeOtp`，规则只一份                                                                                 |
| OTP 错误次数上限         | PASS     | 单个 OTP 错 5 次即作废（MAX_OTP_ATTEMPTS）；输错次数与作废在同一次操作完成，不留可继续撞的记录                                  |
| OTP 错误计数重置         | PASS     | 重发换新记录，attempts 从 0 开始                                                                                                |
| Device/Session 解耦      | PASS     | ensureDevice 只管 Device；Session.deviceId 故意无 FK（ADR-0003）                                                                |
| 会话创建统入口           | PASS     | 四条路径走 `signIn`，不会漏设某块 cookie                                                                                        |
| Device 身份延续          | PASS     | 凡建会话的路径都从 cookie 读 deviceKey，改密不会换设备                                                                          |
| Login timing attack      | PASS     | DUMMY_PASSWORD_HASH 必须为 argon2id 真实产物：伪哈希（如 `$dummy$dummy`）会让 argon2Verify 抛异常而不执行计算，反而放大时间差异 |
| Resend without session   | PASS     | email + IP 双维度限速                                                                                                           |
| DB-side purge            | PASS     | deleteAndCount 替代 JS filter                                                                                                   |
| sessionVersion increment | PASS     | 单条原子 UPDATE（ADR-0004）                                                                                                     |
| RateLimit increment      | PASS     | 单条原子 UPSERT（ADR-0004）                                                                                                     |
| UUID foreign-key types   | PASS     | 已消除全部 as unknown as（ADR-0003）                                                                                            |
| 回归网                   | 355 用例 | vitest；cookie 层、guard、device（含 lastSeen 节流）均有直接用例；pre-commit 与 CI 都跑                                         |

### TODO

1. **重置密码是否顺带验证邮箱** —— 未决问题，见 ADR-0001。当前行为是不碰。
2. **`User.role` 只有 teacher / student** —— 无管理员角色，管理后台类需求需要先决定。
3. **`mail.ts` 目前只往控制台输出** —— 接真实 SMTP 时那段发送逻辑尚无测试覆盖
   （测试里被 mock 掉了）。
