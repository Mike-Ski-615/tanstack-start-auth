import { createMiddleware } from "@tanstack/react-start";

import { getCurrentUser } from "./current-user";

/**
 * server function 鉴权中间件：未登录抛错阻断，已登录注入 { session, user }。
 *
 * 本文件必须独立存在，不可并入 current-user.ts：编译器只从“仅导出
 * middleware”的模块剥离服务端依赖；并入后 getCurrentUser 的 db/session
 * 导入会被拉进客户端 bundle，触发 import-protection 构建失败。
 */
export const authMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const result = await getCurrentUser();

  if (!result) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      session: result.session,
      user: result.user,
    },
  });
});
