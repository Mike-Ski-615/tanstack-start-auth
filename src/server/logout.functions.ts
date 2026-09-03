import { createServerFn } from "@tanstack/react-start";
import { useAppSession } from "#lib/session";

/**
 * 登出用例（文档模式）：清除会话，由客户端导航到首页。
 *
 * 无状态会话下 clear() 即下发过期 Set-Cookie；无需鉴权中间件
 * （未登录调用也只是空操作）。
 */
export const logout = createServerFn({
  method: "POST",
}).handler(async () => {
  const session = await useAppSession();
  await session.clear();

  // 成功仅返回值，由客户端 onSuccess/点击后自行导航
  return { success: true };
});
