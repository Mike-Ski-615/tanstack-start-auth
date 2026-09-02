import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { useAppSession } from "#lib/session";

/**
 * 登出用例（文档模式）：清除会话并重定向到首页。
 *
 * 无状态会话下 clear() 即下发过期 Set-Cookie；无需鉴权中间件
 * （未登录调用也只是空操作）。
 */
export const logout = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useAppSession();
  await session.clear();

  throw redirect({ to: "/" });
});
