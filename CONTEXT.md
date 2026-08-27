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
认证用例之一：为新人创建 User 并立即签发 Session（注册即登录）。
与 authenticate（登录）、signOut（登出）同属 auth 用例模块，
失败以结果值表达（如 email_taken），不抛异常。

### CurrentUser（当前用户）
面向服务与客户端的用户唯一公开形态：{ id, email, name, image, bio }。
投影发生在 current-user 模块源头，passwordHash 等存储层字段永不离开。
