# 主键改用原生 uuid，并声明关系恢复外键完整性

**Status**: 已接受

契约里主键用 `field.id.uuidv7String()`（codec `sql/char@1` → `character(36)`，TS 类型 `Char<36>`），
而外键 `userId` / `deviceId` 用 `field.text()`（→ 纯 `string`）。两者不对称：品牌类型是
`string & { __charLength: 36 }`，所以 `Char<36> → string` 能直接赋值，`string → Char<36>` 报错。
结果是全项目 31 处 id 相关断言（`as Char<36>`、`as unknown as string`），加上手写类型与 ORM 行类型
之间多余的 5 处 `as unknown as Device/Session`，一共 43 处。

更关键的是 `Char<36>` **只按长度打标**：`User.id`、`Device.id`、`Session.id` 全是同一个 `Char<36>`。
它挡不住「把 Device.id 传进需要 userId 的参数」这类真正容易犯的错，却收了断言税。

## Decision

主键改 `field.id.uuidv7Native()`（codec `pg/uuid@1` → `nativeType: uuid` → TS 普通 `string`），
外键改 `field.uuidNative()`。同时用 `rel.belongsTo(User, ...).sql({ fk: { onDelete: "cascade" } })`
声明 4 个外键关系（Device / Session / ResetToken / EmailVerificationToken → User），
补回被手工删掉的引用完整性与级联。

**Considered Options**:
- 保留 `character(36)`，只把外键也改成 `field.uuidString()`（被拒：断言同样全消失、迁移代价完全相同，
  但继续付 36 字节存储，也继续留着那个零语义价值的品牌类型。既然代价一样，没有理由选差的）。
- 保留品牌类型，只删掉 23 处冗余断言（被拒：零迁移零风险，但要永久背 12 处 `as Char<36>`，
  且今后每加一处外键查询都要再手写一次）。

## Consequences

- **uuidv7 前 48 位是明文毫秒时间戳，id 因此泄露账号创建时间。** `CurrentUser.id` 会发给客户端，
  所以这是实际的信息暴露而非理论问题。接受（教学平台场景；要规避可改用 `field.id.nanoid()` 或纯 v4）。
- 放弃了「至少是个 36 字符 string」这层极弱的编译期保护，换来 id 类型全项目统一为 `string`。
- 存储 36 → 16 字节；类型断言 43 → 2（剩下 2 个是 Nitro WS 的 `peer.context`，与本次无关）。
- **`Session.deviceId` 故意不声明外键。** 见 CONTEXT.md「Device」：`ensureDevice()` 删旧 Device 时
  「不管 Session」是既定设计。加 `cascade` 会让旧 Session 被连带删除 —— 而 `createAuthenticatedSession`
  是**先**调 `ensureDevice` 再取 `oldSessionId` 用于踢 WebSocket，于是踢人静默失效；加 `restrict`
  则会让 `ensureDevice` 的删除直接失败。两害相权，那一列保持无约束。
  若将来要重新设计删除顺序，可以再引入这个外键。
- **`User.image` / `User.bio` 的初始值从 DB DEFAULT 移到 `register.functions.ts` 常量。**
  这两个值是文案（"这个人很懒…"）与 web 资源路径（"/default-user.webp"），不是 schema 约束；放在
  create 处才能靠 ORM 的 insert 类型强制所有创建路径传值，改文案也不必写迁移。列保持 NOT NULL 无默认。
  **这一条推翻了 `b86dbe1` / `fa2bee5`「添加数据库默认值」的方向** —— 那两次的动机是「让 User 类型不
  再是 `string | null`」，这个目标没有变，只是实现从 DB DEFAULT 换成了应用层常量。
- 迁移 20260910T0659 需要手工补 4 个 `dropConstraint`：早先的 20260909T1746 建出了这些外键，
  而之后再无迁移删过它们（当年是手工从契约删掉声明后用 `db update` 清的库，没补迁移），
  导致契约快照与「重放迁移得到的库」不一致。改列类型前必须先卸掉引用这些列的 FK，否则空库重放报
  `42804 引用列与被引用列类型不兼容`。**这个坑在长期用 `db update` 迭代的库里不会暴露，只在空库重放时炸。**
