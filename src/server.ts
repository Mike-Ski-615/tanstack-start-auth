/**
 * 服务器入口 —— 框架/构建工具约定的文件（与 `src/router.tsx` 同级）。
 *
 * 唯一一件事：**所有 serverFn 的响应一律 `Cache-Control: no-store`**。
 *
 * ## 为什么在这里，而不是在 serverFn 中间件里
 *
 * 原先这条路走过两站，都不好：
 *
 * 1. **每个 handler 自己写一行**（共 14 处）。失败模式是静默的 —— 漏写一个，
 *    个人化的响应就可能被缓存。而且这 14 处里 6 处属于**未登录**的 handler
 *    （登录 / 注册 / 重置 ×2 / 验证邮件 ×2），认证中间件盖不到它们。
 * 2. **`src/start.ts` 的全局 functionMiddleware**。能达到同样效果，但代价是：
 *    框架对 requestMiddleware 的处理是一个三元（start-server-core 的
 *    createStartHandler）：
 *
 *        requestMiddleware: hasStartInstance ? startOptions.requestMiddleware : [defaultCsrfMiddleware]
 *
 *    也就是说——**一旦存在 start 实例，框架就不再自动装它的 `defaultCsrfMiddleware`**。
 *    当初只声明了 functionMiddleware，于是所有 serverFn 的 CSRF 保护被静默拿掉，
 *    而且没有东西失败（dev 的警告只在请求真的打到 serverFn 时才触发）。
 *
 * 放在这里两个问题都没有：覆盖全部 serverFn、零 per-handler 仪式，
 * 且不碰任何框架默认行为（CSRF 由框架自动装）。
 *
 * ## 为什么必须禁止缓存
 *
 * serverFn 的 URL 是 `/_serverFn/<base64 of {file, export}>` —— **不含任何用户
 * 标识**。同一个 URL 对 A 与 B 返回不同内容（getUserFn / listSessionsFn /
 * listNotificationsFn 等），所以它必须不可缓存：否则共享代理或共享浏览器配置
 * 理论上能把 A 的响应给 B。
 *
 * 写法上是「**没设过才奶底**」（`if (!has("Cache-Control"))`），而不是无条件覆盖：
 * 这样将来真出现不可缓存的例外，在它的 handler 里 `setResponseHeader` 自己写一个
 * 就行 —— 本文件在 handler 之后跑，无条件覆盖会把那个例外吃掉。
 */

import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

/** 与框架同一来源（createStartHandler / createServerRpc 都用它拼 serverFn URL）。 */
const SERVER_FN_BASE = process.env.TSS_SERVER_FN_BASE ?? "/_serverFn/";

export default createServerEntry({
  async fetch(request) {
    const response = await handler.fetch(request);

    if (new URL(request.url).pathname.startsWith(SERVER_FN_BASE)) {
      // 没设过才奶底 —— 某个 handler 自己设了 Cache-Control 就以它为准
      if (!response.headers.has("Cache-Control")) {
        response.headers.set("Cache-Control", "no-store");
      }
    }

    return response;
  },
});
