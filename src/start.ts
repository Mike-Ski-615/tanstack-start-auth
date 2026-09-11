/**
 * TanStack Start 的 start 实例 —— 框架约定的入口（与 `src/server.ts` /
 * `src/router.tsx` 同级，由 start 编译器按约定加载）。
 *
 * 目前只有一件事：**所有 serverFn 的响应一律 no-store**。
 *
 * ## 为什么是全局的
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
 *
 * 这条保证有测试盯着：`src/server/__tests__/cache-control.test.ts` ——
 * 它故意同时测一个已登录与一个未登录的接口，因为「全局」这件事的要害正在于
 * 后者也被盖住。
 */

import { createMiddleware, createStart } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

const noStore = createMiddleware({ type: "function" }).server(async ({ next }) => {
  setResponseHeader("Cache-Control", "no-store");
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [noStore],
}));
