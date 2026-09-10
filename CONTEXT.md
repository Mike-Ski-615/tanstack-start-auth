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

### Activity（活动）

数据源是 `LoginEvent` 表（每次成功登录一行，由 `signIn` 写入 —— 那是所有
登录路径的统一入口，含注册后自动登录、改密重建会话、重置密码后登录）。

**不能用 Session 表当数据源**：单设备模型下 `Session.userId` 是 UNIQUE，
新登录覆盖旧记录，历史全丢。

**存原始事件而非每日计数**：聚合口径会变（一天多次算一次还是多次），存事件
随时能改算法，存计数要改就得重算历史。代价是查询要 GROUP BY，但登录频率低。

两个口径都存在：热力图按**当日次数**着色，`activeDays` / `currentStreak`
按**天去重**计。

`currentStreak` 的口径是「从今天往前连续有登录的天数」——今天没登录就是 0，
不往前顺延（否则「昨天登录过、今天还没」会显示一个并未持续到今天的数字）。

全程 UTC 算日期边界，与热力图原来的注释同一理由：服务端与浏览器时区不同
会让 SSR 与客户端的「今天」不一致。

`recordLogin` 的失败被吞掉 —— 统计是附属信息，不该让用户登录失败
（与 `touchLastSeen` 同样的取舍）。

### Notification（通知）

两层结构：

- `Notification` —— 管理员**发出的一次**（批次）：title / body / 可选 link / createdBy
- `NotificationRecipient` —— **一条通知 × 一个收件人**：readAt（null=未读）/ deletedAt

分两层是因为两者的删除语义不同：管理员**撤回**以批次为单位（真删，cascade
带走所有收件行）；用户**删除**只影响自己那份（软删，打 `deletedAt`）。

**受众只有 student / teacher**。管理员既不发给自己、也永远收不到 —— 与
`MANAGED_ROLES` 的原则一致，`resolveRecipients` 三路都会剔除 admin 与发送者。

发送目标三选可混：全体 / 按角色 / 指定人（后两者取并集去重）。勾「全体」时
另外两项被忽略（前端禁用，接口层也兜一道）。

`link` 必须是站内路径（以 `/` 开头，且拒绝 `//` 开头）—— 允许外链会变成
钓鱼入口：管理员账号一旦被盗，攻击者能给全体师生发跳转到仿冒登录页的通知。

未读数 30s 轮询（与 useSessionGuard 同节奏）；列表只在铃铛打开时才拉。

**弹窗提醒**：`User.notifyOnNewMessage`（默认 true，存数据库而非 localStorage
—— 多设备登录时「要不要打扰我」应当跟随账号）。开关在 /settings/bell。
`useNewNotificationToast` 挂在 authenticated 布局上，**只在未读数上升时弹**，
首次加载只记基线不弹（否则每次刷新都会重放旧通知）。开关关闭期间基线仍更新，
重新打开不会把攒下的通知一次倒出来。

阅读统计（管理员页）**不轮询** —— 那是偶尔看一眼的数据，刷新页面即可。

### Role（角色）

三个值：`student` / `teacher` / `admin`，默认 `student`。两处定义必须同步：
`prisma/contract.ts` 的 Role enum（数据库 CHECK 约束）与
`lib/auth/current-user.ts` 的 `ROLES`（应用层类型 + `ROLE_HOME` 路由表）。

**用途只有路由重定向**：登录后按 `ROLE_HOME[user.role]` 落到对应工作台，
每个工作台的 `beforeLoad` 再校验自己的角色，不符就跳回**他自己**那个
（不是跳到对家 —— 否则新角色会造成乱跳）。

**服务端没有任何基于 role 的校验**。这个结论很重要：它意味着目前
「老师 / 管理员」的描述都是**业务分组，不是权限**，任何登录用户能调用的
serverFn 都能被任何角色调用。要加真权限时，得先补服务端校验。

`admin` 是预留值 —— 不比其他角色多任何权限，工作台页与其他两页等价。
详见 TODO。

**侧边栏按角色分**（`data/nav.ts` 的 `NAV_BY_ROLE`）：

| 角色    | 菜单                                     |
| ------- | ---------------------------------------- |
| student | 资源、课例                               |
| teacher | 资源、课例 + 小组合作、展评、拓展        |
| admin   | 教师管理、学生管理（不与师生共享任何项） |

用 `Record<Role, NavGroup[]>` 而非「基础菜单 + 按角色追加」：加角色时
漏配会编译报错，而不是给人一个空侧边栏。注意**这只是可见性，不是权限** ——
真正的访问控制仍要在服务端做（见上一段）。

### ResetToken（重置 OTP）

DB 承载：ResetToken 表存 SHA-256(6 位数字) + userId + attempts + expiresAt + usedAt。
**tokenHash 没有唯一约束** —— 两个用户撞到同一个 6 位数字是正常的，校验按
userId 查记录（见 ADR-0006；加唯一会让第二个人直接 500）。
15 分钟有效，一次性（usedAt 标记已使用），单个 OTP 错 5 次即作废。

使用流程：用户在忘记密码页提交邮箱 → 邮件收到 6 位验证码 → 在
`/auth/reset?email=...` 页输入验证码 + 新密码 → 重置成功并自动登录。

**为何用 6 位数字而非 URL 里的长令牌**：用户不用切回邮件点链接，直接在页面上
输入。代价是熵从 256-bit 降到 20-bit（100 万种），补偿手段是错误次数上限 +
双维度限速（见 RateLimit）。**这两个补偿缺一不可** —— 没有它们，6 位数字
几分钟就能被脚本撞开。

### EmailVerificationToken（邮箱验证 OTP）

DB 承载：EmailVerificationToken 表存 SHA-256(6 位数字) + userId + attempts +
**tokenHash 同样无唯一约束**（理由同上，见 ADR-0006）。
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

注意：重置**不**写 `User.emailVerifiedAt`。这是明确决策而非遗漏 ——
「能收到重置邮件」不等于「用户确认了这个邮箱」，详见 ADR-0001。

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

1. **`admin` 角色是预留的** —— 枚举里已有（student / teacher / admin），但 admin
   目前不比其他角色多任何权限，登录后落在一个与其他两页等价的占位工作台。
   接入真实管理功能时需要先定义「管理员能做什么」。注意：`role` 至今只用于
   路由重定向，**服务端没有任何基于 role 的校验** —— 真要做权限控制，
   第一件事是补上它。
2. **`mail.ts` 目前只往控制台输出** —— 接真实 SMTP 时那段发送逻辑尚无测试覆盖
   （测试里被 mock 掉了）。
3. **重置成功后未引导用户去验证邮箱** —— 当前重置完只改密码，设置页仍显示
   「邮箱未验证」。若要消除这个提示，正确做法是引导用户走一遍验证
   （跳到 `/auth/verify-email`），而不是替他把 `emailVerifiedAt` 写上去。
   是的：ADR-0001 已否决后者。
