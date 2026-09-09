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
建用户 → 创建邮箱验证令牌（旧令牌失效）→ 发验证邮件 → 跳转「请查收邮件」页。
用户点击验证链接 → verifyEmailFn → 原子消费令牌 + 设 User.emailVerifiedAt → 创建 Device + Session → 设 cookie → 自动登录。
注册不证明邮箱所有权，需用户点击验证链接完成验证。
并发竞态由数据库唯一约束兜底。

### CurrentUser（当前用户）
面向服务与客户端的用户唯一公开形态：{ id, email, name, image, bio, role, status, sessionVersion }。
投影发生在查询源头（guard 的 select 分支），passwordHash 等存储层字段不进入查询结果。

### Reset Token（重置令牌）
DB 承载：ResetToken 表存 SHA-256(随机串) + userId + expiresAt + usedAt。
15 分钟有效，一次性（usedAt 标记已使用）。相比无状态 JWT 的取舍：
支持严格一次性（使用后标记），支持撤销（删记录），代价是多一次查库。

### EmailVerificationToken（邮箱验证令牌）
DB 承载：EmailVerificationToken 表存 SHA-256(随机串) + userId + expiresAt + verifiedAt。
24 小时有效，一次性（verifiedAt 标记已验证）。
注册时创建并发邮件，用户点击链接完成验证。

### sessionVersion（会话版本）
User 级别的整数计数器，用于全局会话失效。
- 注册：不递增
- 普通登录：不递增（旧 Session 已被删除）
- 改密：递增
- 重置密码：递增
- 撤销全部会话：递增

校验：`Session.sessionVersion === User.sessionVersion`，不匹配则 Session 失效。

> ⚠️ 当前实现为 read-modify-write（SELECT → JS +1 → UPDATE）。并发两次 invalidate
> 可能都读到同一 version，导致其中一次递增丢失。这不会造成旧 Session 重新生效
> （两次操作都希望失效，第一次已提升 version），属于计数精度问题而非认证绕过。
> TODO: Prisma 8 支持 expression-based update 后改为 `UPDATE ... SET sessionVersion = sessionVersion + 1`。

### reset（密码重置）
认证用例之一：验签令牌 → 改密 → 递增 sessionVersion → 创建新 Device + 新 Session（自动登录）。
令牌验证在服务端有副作用（写 usedAt），改动前旧会话全部失效。
请求入口防账号枚举：无论邮箱是否存在，恒返回同一响应。

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
滑动窗口：1 分钟窗口，登录 5 次/分钟（email+IP），注册 3 次/分钟（IP），重置 3 次/分钟（IP），重发邮件 3 次/分钟（IP+email）。
窗口过期时重置计数（upsert 复用行），而非逐条清理。`purgeExpiredRateLimit()` 清理过期行。

### WebSocket Presence & Kick
连接追踪（单实例内存注册表 `lib/auth/ws-registry.ts`）：
- `peersBySession: Map<sessionId, Set<peerId>>` → 支持精确 kick
- `peersByUser: Map<userId, Set<peerId>>` → 支持 presence
- `peerRefs: Map<peerId, {peer, userId, sessionId}>` → 支持 close

生命周期：
- open → registerPeer → 仅首次设 status=online
- close → unregisterPeer → 仅末次设 status=offline

WS 握手绑定 sessionId（非仅 userId），Session revoke 后踢旧连接：
- `kickSession(sessionId)` → 关闭该 Session 的所有 WS（close code 4001）
- `kickAllSessionsForUser(userId)` → 关闭该用户的所有 WS（close code 4002）

多实例部署时需替换为 Redis/DB 方案。

### Fail-Closed 顺序
无多语句 transaction 前提下，安全敏感操作采用 fail-closed 顺序：
- 改密：invalidateAllSessions → update passwordHash → createAuthenticatedSession
- 重置：consume token → invalidateAllSessions → update passwordHash → createAuthenticatedSession
若 invalidate 失败，密码不被修改（用户被登出但密码安全）。

### WS Close Codes
- 4001 SESSION_REPLACED: Session 被新登录替换
- 4002 ALL_SESSIONS_REVOKED: 用户撤销全部会话

### 概念分离

| 概念 | 存储位置 | 职责 | 生命周期 |
|------|----------|------|----------|
| `deviceKey` | Cookie + Device 表 | 设备身份标识（≠ 认证凭证） | 长期（> Session） |
| `session-token` | Cookie + Session 表 | 认证凭证 | 7 天 |
| `sessionVersion` | User 表 | 全局会话失效开关 | 随 User 永久 |
| `WS sessionId` | WS peer context | 实时连接授权绑定 | WS 连接期间 |
| `presence` | 内存 Set<peerId> | 在线状态（WS 连接状态） | WS 连接期间 |

### 架构模型
```
User
 ├── sessionVersion
 └── Device (1:1) ──── deviceKey = 设备身份标识
       └── Session (1:1) ──── session-token = 认证凭证
             └── WebSocket connection(s) ──── sessionId = 实时授权绑定
```

### 安全审计状态

| 模块 | 状态 | 备注 |
|------|------|------|
| Reset Token atomic consume | PASS | 单条 SQL 原子消费 |
| Email Verification atomic consume | PASS | 单条 SQL + 同步 User.emailVerifiedAt |
| WS presence race | PASS | Set<peerId> 幂等 open/close |
| WS session kick | PASS | kickSession + kickAllSessionsForUser |
| Device/Session 解耦 | PASS | ensureDevice 只管 Device |
| Login timing attack | PASS | DUMMY_PASSWORD_HASH 恒定时间 |
| Resend without session | PASS | email + IP 双维度限速 |
| DB-side purge | PASS | deleteAndCount 替代 JS filter |
| sessionVersion increment | TODO | read-modify-write，Prisma 8 支持 expression update 后改为原子 |
| RateLimit increment | TODO | read-modify-write，Prisma 8 支持 expression update 后改为原子 |
| UUID  foreign-key types | TODO | 消除 as unknown as 待 Prisma 8 contract API 确认 |

### TODO

**P2 — 工程性限制（非认证漏洞）：**
1. `sessionVersion` → DB atomic increment（等待 Prisma 8 expression update API）
2. `RateLimit` → atomic increment（等待 Redis INCR 或 Prisma 8 expression update）
3. UUID foreign-key types → remove `as unknown as string` casts

**Scale — 横向扩展约束：**
4. WS in-memory peer registry → Redis / PubSub 当多实例部署
