import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "./auth/auth.middleware";
import { endSession } from "./auth/session";

/** 登出用例：撤销会话并清除 cookie。无失败面（sessionId 来自鉴权中间件）。 */
export const logout = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await endSession(context.session.id);

    return {
      ok: true,
    };
  });
