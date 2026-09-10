# 计数值改用原子 UPDATE/UPSERT，不再 read-modify-write

**Status**: 已接受

`sessionVersion` 和 `RateLimit.count` 原先都是 `SELECT → JS +1 → UPDATE 绝对值`。
两处的代码注释都判断「并发概率低，微小竞争可接受」。**限速那处判断是错的**，
实测见下。

## Decision

两处都改成单条语句内的表达式自增：

- `sessionVersion`：SQL builder 的 `db.sql.public.User.update((f, fns) => ({ sessionVersion: fns.raw\`${f.sessionVersion} + 1\`.returns({ codecId: "pg/int4@1" }) })).where(...)`，
  经 `db.runtime().execute(plan)` 执行 → `UPDATE ... SET "sessionVersion" = "sessionVersion" + 1`。
  列引用 `${f.sessionVersion}` 由 builder 渲染，没有硬编码标识符。
- `RateLimit`：`db.raw.sql` 写整条 `INSERT ... ON CONFLICT ("key") DO UPDATE SET count = CASE ... END RETURNING count, windowStart`，
  经 `db.runtime().query(plan)` 执行。窗口判断、递增/重置、取回计数在一条语句里完成。
  这里表名/列名是字面量（builder 无法表达 upsert-with-expression），已在代码里标注这个上限。

## Context —— 为什么「微小竞争可接受」是错的

限速器的竞态不是精度问题，是 **TOCTOU 完全绕过**：

```
两个并发请求，count=0，max=5
  都 SELECT 到 count=0
  都通过 count >= max 检查
  都写回 count=1
→ 两次都放行，计数只加了 1
```

实测（`rateLimit("login", sameId)` 并发 20 次，`LIMITS.login = 5`）：

| | 放行次数 | 最终 count |
|---|---|---|
| 旧实现 | **20** | 2 |
| 新实现 | **5** | 20 |

`register` / `reset` / `resend` 同理（并发 30 → 恰好放行 3）。而**限速器要挡的正是突发流量，
突发就是并发** —— 攻击者只要并行发请求就能绕过登录/注册/重置限速。所以这不是「可接受的微小竞争」。

`sessionVersion` 那处的原判断是对的：丢失一次递增不会让旧 Session 复活（version 仍然变大），
属于计数精度问题。但它同样改成原子自增，因为代价一样、还少一次查询。

`RateLimit.count` 的语义随之变为「窗口内的**尝试**次数」（被拒的请求也计数）。
不会延长封锁：`windowStart` 不因递增而移动，窗口到期照常重置。

## 顺带查清的 Prisma 8 API（原先的 TODO 等的就是它）

CONTEXT.md 的 TODO 写着「等待 Prisma 8 expression update API」。它**已经存在**：

- `db.sql.<ns>.<Table>.update((fields, fns) => ...)` 是 SQL builder 上 `update` 的第二个重载，
  回调返回值是 `ResolvedUpdateExpressions`（值可以是 `Expression` 而不只是字面量）。
  `fns` 只有比较/布尔运算，**没有算术**；算术要用 `fns.raw\`...\`.returns({ codecId })` 拼。
- `db.raw.sql\`...\`` 是整条语句的原始通道，`.returnsRow(spec)` / `.affectedCount()` 两种终点。
- **执行通道有两个，容易搞错**：`db.runtime().query(plan)` 取行，`db.runtime().execute(plan)`
  取影响行数。对 `.returnsRow(...)` 的 plan 调 `execute` 不会报错，只会静默返回
  `{ affectedRows: n }` —— 连 `SELECT 1` 都这样。这个坑花了几轮才定位。
- ORM 的 `update` / `upsert` 只接受字面量值，表达式自增必须走上面两条 builder/raw 通道。

## Consequences

- 两个计数值在任何并发度下都精确递增。限速不再可被并发绕过。
- 各少一次查询：`sessionVersion` 的 SELECT+UPDATE → 单条 UPDATE；`RateLimit` 的 SELECT+UPDATE → 单条 UPSERT。
- `RateLimit` 那处引入了一条原始 SQL，失去表名/列名的编译期保护（改契约不会报错，只在运行时炸）。
  上限可接受：单表、单用途、已注释。若将来要消除，需要 builder 支持 upsert-with-expression。
- CONTEXT.md 安全审计表两行由 TODO 改为 PASS，P2 TODO 清单清空（只剩 WS 横向扩展一条）。
