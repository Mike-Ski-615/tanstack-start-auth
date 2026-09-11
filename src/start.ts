/**
 * TanStack Start 的 start 实例 —— 框架约定的入口（与 `src/server.ts` /
 * `src/router.tsx` 同级，由 start 编译器按约定加载）。
 *
 * 声明两件事：全局 no-store（functionMiddleware）与 CSRF（requestMiddleware）。
 *
 * ## ⚠️ 这个文件一旦存在，框架就不再给你兜底 CSRF
 *
 * 框架的处理是这样的（@tanstack/start-server-core 的 createStartHandler）：
 *
 *     requestMiddleware: hasStartInstance ? startOptions.requestMiddleware : [defaultCsrfMiddleware]
 *
 * 也就是：**没有 start 实例**时，框架自动给 serverFn 装上 `defaultCsrfMiddleware`；
 * 而**有了 start 实例却没声明 `requestMiddleware`**，那就是 `undefined` ——
 * 一个 CSRF 中间件都没有。
 *
 * 这一条踩过：当初为了让 no-store 全局化而加上本文件，只声明了
 * `functionMiddleware`，于是**静默地拿掉了框架自动提供的 CSRF 保护**。
 * 它没有让任何东西失败 —— dev 下框架会打印警告，但那条警告只在请求真的打到
 * `/_serverFn/` 时才触发，而 typecheck / build 都不会触发它。
 *
 * 所以：**只要本文件存在，`requestMiddleware` 里的 CSRF 就必须在**。
 *
 * ## no-store：为什么必须是全局的
 *
 * 原先每个 handler 自己写一行 `setResponseHeader("Cache-Control", "no-store")`，
 * 共 14 处。失败模式是静默的 —— 漏写一个，个人化的响应就可能被缓存。
 *
 * 这 14 处里 **6 处属于未登录的 handler**（登录 / 注册 / 重置 ×2 / 验证邮件 ×2），
 * 所以 no-store 与认证是正交的：任何认证中间件都盖不住它们，只有全局能一次收掉。
 *
 * 现状：本应用没有任何可缓存的 serverFn 响应（唯一没有 no-store 的 GET 是
 * `getUserById`，它返回的是任意用户的公开资料，与当前会话无关）。将来真出现
 * 可缓存的接口，在它的 handler 里再 `setResponseHeader("Cache-Control", ...)`
 * 覆盖即可（handler 在中间件之后跑）。
 */

import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const noStore = createMiddleware({ type: "function" }).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "no-store");
  return next();
});

/**
 * CSRF：serverFn 是同源 RPC 端点，必须挡住跨站发起的请求。
 *
 * `filter` 限成 serverFn —— 这正是框架原本自动装的那个（`defaultCsrfMiddleware`），
 * 写在这里只是因为我们接管了 start 实例。**不要删**，理由见文件头。
 */
const csrf = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [noStore],
  requestMiddleware: [csrf],
}));
