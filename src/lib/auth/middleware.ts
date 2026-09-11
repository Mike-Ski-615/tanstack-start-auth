/**
 * serverFn 的认证中间件 —— 「受保护的 serverFn」这个 module。
 *
 * ## 为什么是中间件，而不是「每个 handler 第一行 await requireAdmin()」
 *
 * 那个写法靠注释执行。admin-guard.ts 原来的 doc 是这么写的：
 * 「每个 admin 接口的第一行都必须是 `await requireAdmin()`」——
 * 忘了写不会报错，接口就是公开的。
 *
 * 中间件把这条约定搬进类型系统：**要读 `context.user` 的 handler 漏挂就编译不过**。
 *
 * 但它只盖住读 `context.user` 的那些。像 `listSelectableUsersFn` /
 * `deleteNotificationBatchFn` / `listUsersByRoleFn` 这种不读它的管理接口，
 * 漏挂会照常编译通过 —— 而它们返回的是全部用户邮箱 / 已发通知 / 可选联系人。
 * 那一半由 `src/server/__tests__/guarded-handlers.test.ts` 按文件扫链上的
 * 中间件补上。所以「忘了鉴权」现在有两道网，而不是一道注释。
 *
 * ## 三个出口，对应三种**不同**的真实行为
 *
 * 它们不能合并成一个 —— 合并会同时打破三处：
 *
 * | 出口           | 无会话时             | 谁用                                      |
 * | -------------- | -------------------- | ----------------------------------------- |
 * | `withUser`     | `context.user = null` | getUserFn / listSessionsFn / getUserById   |
 * | `requireUser`  | 抛 UNAUTHENTICATED   | 写操作                                    |
 * | `requireAdmin` | 抛 FORBIDDEN         | 管理接口                                  |
 *
 * `withUser` 的三个调用点**不能**抛：客户端的 `useSessionGuard` 靠 30 秒轮询
 * `getUserFn` 返回 `null` 来发现会话失效，抛了就变成报错而不是「已登出」；
 * `listSessionsFn` 未登录时返回空壳（`device: null`）而不是错误。
 *
 * 还有一处不走 `requireUser`：changePasswordFn 在无会话时抛的是
 * **WRONG_PASSWORD**（防枚举，见其注释），所以它用 `withUser` 自己判空。
 * 那些错误文案是安全取舍，不该被一次重构顺手改掉。
 *
 * ## 执行顺序
 *
 * 中间件在 validator **之前**跑。所以调用点写成
 * `.middleware([requireAdmin]).validator(schema)` —— 与执行顺序一致，
 * 未授权请求不会走到解析输入那一步。
 *
 * ## no-store 不在这里
 *
 * 它和认证是**正交**的：14 处 no-store 里 6 处属于未登录的 handler
 * （登录 / 注册 / 重置 ×2 / 验证邮件 ×2），任何认证中间件都盖不到。
 * 所以它由 `src/server.ts` 在响应层统一奶底（理由与踩过的坑见那个文件）。
 */

import { createMiddleware } from "@tanstack/react-start";
import { ERROR_MESSAGE } from "#lib/error-messages";
import { getCurrentUser } from "./guard";

/**
 * 取会话里的用户（可能为 null）放进 context。
 *
 * 副作用沿用 guard：`getCurrentUser` 内部节流更新 `Device.lastSeenAt`。
 */
export const withUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  return next({ context: { user: await getCurrentUser() } });
});

/**
 * 会话必须存在，否则抛 UNAUTHENTICATED。
 *
 * 重新 `next({ context: { user } })` 不是为了冗余：它把 `user` 的类型从
 * `User | null` 收窄成 `User`（框架的 Assign 在键重叠时取后发送的那个），
 * 否则每个 handler 都要自己判空 —— 那就等于没省掉仪式。
 */
export const requireUser = createMiddleware({ type: "function" })
  .middleware([withUser])
  .server(async ({ next, context }) => {
    const { user } = context;
    if (!user) throw new Error(ERROR_MESSAGE.UNAUTHENTICATED);
    return next({ context: { user } });
  });

/**
 * 必须是 admin。
 *
 * 未登录与非 admin 抛**同一个** FORBIDDEN —— 不区分「你没登录」和
 * 「你不够格」，避免给探测者额外信息（与原来的 requireAdmin 一致）。
 *
 * 链在 `withUser` 而非 `requireUser` 上：后者会抛 UNAUTHENTICATED，
 * 那就区分出两种错误了。
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([withUser])
  .server(async ({ next, context }) => {
    const { user } = context;
    if (!user || user.role !== "admin") throw new Error(ERROR_MESSAGE.FORBIDDEN);
    return next({ context: { user } });
  });
