# CONTEXT

## 术语表

### Session（会话）
User 的登录态，无状态承载：一张加密 cookie（iron-session 风格），服务端不落库（
session.ts）。数据仅 userId，其余用户信息读取时经 getUserFn 从用户表 join 公开字段。
7 天过期。**无法服务端撤销**：旧 cookie 在自然过期前仍有效——这是弃 DB 会话换
与 login/logout 同薄的形态的已知取舍。库中不再有 Session 表。

### enroll（注册开户）
认证用例之一：创建 User 并即登录（注册即登录）：
建用户与签发 Session 同事务，要么一起落地要么一起回滚。
与 authenticate（登录）、signOut（登出）同为认证用例，
用例逻辑直接内联在对应 server function 的 handler 中
（register/login/logout.functions.ts），失败以抛错表达
（如 "Unable to create account"）。
注：邮箱验证已移除（见 ADR-0002），注册不证明邮箱所有权。

### CurrentUser（当前用户）
面向服务与客户端的用户唯一公开形态：{ id, email, name, image, bio }。
投影发生在查询源头（readSession 的 select 分支），passwordHash 等存储层字段不进入查询结果。

### Reset Token（重置令牌）
无状态：HMAC 签名的自包含串 { exp, userId }（reset.functions.ts），复用 SESSION_SECRET，
15 分钟有效，不落库。无 DB 令牌表的代价（文档取舍）：
无严格一次性（有效期内同一链接可重放，防枚举靠短 TTL），无每用户重发冷却
（靠邮件服务商限流）。库中不再有 Token 表。

### reset（密码重置）
认证用例之一：验签令牌 → 改密 → 签出新会话 cookie（自动登录）。
令牌验证在服务端纯验签、无副作用，改动前旧会话 cookie 无法撤销。
请求入口防账号枚举：无论邮箱是否存在，恒返回同一响应。
