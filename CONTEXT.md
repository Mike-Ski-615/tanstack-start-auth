# CONTEXT

## 术语表

### Session（会话）
User 的一次登录态记录。凭 Session Token 建立，7 天过期，可被撤销（revokedAt）。
存储于 Session 表，token 仅存 sha256 哈希。

### Session Token（会话令牌）
32 字节随机数（base64url），经 `__Host-session` cookie 下发。
数据库只保存其 sha256 哈希，泄漏库表不等于泄漏登录态。

### 签发即顶替（supersedes）
Session 模块的不变量：为某 User 签发新 Session 时，
该用户所有现存活跃 Session 一律撤销。产品语义为单设备在线。

### enroll（注册开户）
认证用例之一：创建未验证的 User 并发送验证邮件，不签发 Session。
用户在邮箱中点击验证链接（verifyEmail）后才获得第一个 Session。
与 authenticate（登录）、signOut（登出）同属 auth 用例模块，
失败以结果值表达（如 email_taken），不抛异常。

### CurrentUser（当前用户）
面向服务与客户端的用户唯一公开形态：{ id, email, name, image, bio }。
投影发生在 current-user 模块源头，passwordHash 等存储层字段永不离开。

### verified（已验证）
User 的真实属性：该账号的邮箱所有权已被证明。
验证是登录的硬门槛——未验证的账号无法通过 authenticate。

### Verification Token（验证令牌）
一次性、有过期时间的令牌，经邮件链接下发，库存 sha256 哈希。
两个用途（purpose）：verify_email（24 小时有效）与 reset_password（1 小时有效）。
不变量：单一性（每用户每用途至多一个活令牌，重发作废旧令牌，60 秒冷却）
与一次性（命中即消费）。

### reset（密码重置）
认证用例之一：凭重置令牌设置新密码。
成功后同时标记 verified（见 ADR-0001）并签发新 Session，
签发即顶替自动撤销全部旧会话。请求入口防账号枚举：
无论邮箱是否存在，恒返回同一响应。
