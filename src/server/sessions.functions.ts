import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { requireUser, withUser } from "#lib/auth/middleware";
import { invalidateAllSessions } from "#lib/auth/session-manager";

/**
 * 当前用户的设备、会话、账户安全信息（用于隐私与安全页展示）。
 *
 * 单设备模型：一个用户最多一个 Device + 一个 Session。
 *
 * 用 `withUser` 而非 `requireUser`：未登录时返回空壳（`device: null`）
 * 而不是抛错 —— 页面靠这个形状渲染「无设备」态。
 */
export const listSessionsFn = createServerFn({
  method: "GET",
})
  .middleware([withUser])
  .handler(async ({ context }) => {
    const { user } = context;
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
})
  .middleware([requireUser])
  .handler(async ({ context }) => {
    // 递增 sessionVersion → 所有 Session 全局失效
    await invalidateAllSessions(context.user.id);

    return { success: true as const };
  });
