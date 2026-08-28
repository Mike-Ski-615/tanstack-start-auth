# CONTEXT

## 术语表

### Session（会话）
User 的一次登录态记录。凭 Session Token 建立，7 天过期，可被撤销（revokedAt）。
存储于 Session 表，token 仅存 sha256 哈希。
读取时 join 携带 user 公开字段（一次查询）；签发时顺手清理该用户已过期行。

### Session Token（会话令牌）
32 字节随机数（base64url），经 `__Host-session` cookie 下发。
数据库只保存其 sha256 哈希，泄漏库表不等于泄漏登录态。

### 签发即顶替（supersedes）
Session 模块的不变量：为某 User 签发新 Session 时，
该用户所有现存活跃 Session 一律撤销。产品语义为单设备在线。

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
一次性、有过期时间（1 小时）的令牌，经密码重置邮件下发，库存 sha256 哈希。
不变量：单一性（每用户至多一个活令牌，重发作废旧令牌，60 秒冷却）
与一次性（命中即消费）。

### reset（密码重置）
认证用例之一：凭重置令牌设置新密码。
成功后签发新 Session，签发即顶替自动撤销全部旧会话。
请求入口防账号枚举：无论邮箱是否存在，恒返回同一响应。
