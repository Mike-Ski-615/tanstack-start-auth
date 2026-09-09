# CONTEXT

## 术语表

### Session（会话）
User 的登录态，DB 承载：cookie 仅存不透明令牌（session-token，32 字节随机串 hex），
服务端 Session 表存 SHA-256(令牌) + userAgent + ip + expiresAt + revokedAt。7 天过期。
**单设备在线**：createSession 时自动撤销该用户所有旧会话（revokedAt 标记），
新设备登录即踢出旧设备。会话可服务端撤销（登出 / 改密 / 新登录均写入 revokedAt）。

### enroll（注册开户）
认证用例之一：创建 User 并即登录（注册即登录）：
建用户与创建 Session 同一 handler 内完成。
与 authenticate（登录）、signOut（登出）同为认证用例，
用例逻辑直接内联在对应 server function 的 handler 中
（register/login/logout.functions.ts），失败以抛错表达
（如 "Unable to create account"）。
注：邮箱验证已移除（见 ADR-0002），注册不证明邮箱所有权。

### CurrentUser（当前用户）
面向服务与客户端的用户唯一公开形态：{ id, email, name, image, bio }。
投影发生在查询源头（guard 的 select 分支），passwordHash 等存储层字段不进入查询结果。

### Reset Token（重置令牌）
DB 承载：ResetToken 表存 SHA-256(随机串) + userId + expiresAt + usedAt。
15 分钟有效，一次性（usedAt 标记已使用）。相比无状态 JWT 的取舍：
支持严格一次性（使用后标记），支持撤销（删记录），代价是多一次查库。

### reset（密码重置）
认证用例之一：验签令牌 → 改密 → 创建新会话（自动登录）→ 撤销所有旧会话。
令牌验证在服务端有副作用（写 usedAt），改动前旧会话全部失效。
请求入口防账号枚举：无论邮箱是否存在，恒返回同一响应。

### RateLimit（速率限制）
DB 承载：RateLimit 表存 key（类型:标识符）+ count + windowStart + expiresAt。
滑动窗口：1 分钟窗口，登录 5 次/分钟（email+IP），重置 3 次/分钟（IP）。
窗口过期时重置计数（upsert 复用行），而非逐条清理。count 递增非原子，
限速场景下微小竞争可接受。`purgeExpiredRateLimit()` 清理过期行。
