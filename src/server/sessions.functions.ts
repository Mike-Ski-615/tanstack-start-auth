import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";
import { invalidateAllSessions } from "#lib/auth/session-manager";

/**
 * 当前用户的设备、会话、账户安全信息（用于隐私与安全页展示）。
 *
 * 单设备模型：一个用户最多一个 Device + 一个 Session。
 */
export const listSessionsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");

  const user = await getCurrentUser();
  if (!user) return { device: null, session: null, emailVerifiedAt: null };

  // 分成两次查询，而不是 include()：
  // include() 的结果类型带 `{ [x: string]: unknown }` 索引签名（上游
  // IncludedRelationsForRow 未传 NsId），过不了 createServerFn 的可序列化校验，
  // 只能再手工抄一遍字段字面量 —— 字段清单重复两处，且漏改一边不会报错。
  // 分开查则每张表只写一次 .select()，多一次往返换掉那个静默失败面。
  //
  // 注意：下面两个 select 就是发给客户端的字段白名单。
  // tokenHash / deviceKey 是凭证，绝不可加进来；要加字段先想清楚是否必要。
  const [device, session] = await Promise.all([
    db.orm.public.Device.where({ userId: user.id })
      .select("id", "name", "platform", "userAgent", "ip", "lastSeenAt", "createdAt")
      .first(),
    db.orm.public.Session.where({ userId: user.id })
      .select("id", "sessionVersion", "createdAt", "expiresAt")
      .first(),
  ]);

  return {
    device: device ?? null,
    session: session ?? null,
    emailVerifiedAt: user.emailVerifiedAt,
  };
});

/**
 * 撤销当前用户全部会话（登出所有设备）。
 * 实现：递增 sessionVersion → 所有 Session 全局失效。
 */
export const revokeAllSessionsFn = createServerFn({
  method: "POST",
}).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");

  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");

  // 递增 sessionVersion → 所有 Session 全局失效
  await invalidateAllSessions(user.id);

  return { success: true as const };
});
