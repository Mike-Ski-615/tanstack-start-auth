import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";
import { invalidateAllSessions } from "#lib/auth/session-manager";
import { kickAllSessionsForUser } from "#lib/auth/ws-registry";

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
  if (!user) return { device: null, session: null };

  // 一次查询带出 Device + Session（契约声明的 1:1 关系），代替原来两次往返。
  const row = await db.orm.public.User.where({ id: user.id })
    .include("device", (d) =>
      d.select("id", "name", "platform", "userAgent", "ip", "lastSeenAt", "createdAt"),
    )
    .include("session", (s) =>
      s.select("id", "sessionVersion", "createdAt", "expiresAt"),
    )
    .first();

  const device = row?.device;
  const session = row?.session;

  // 注意：必须手动投影成新对象字面量。`include()` 的结果类型带一个
  // `{ [x: string]: unknown }` 索引签名（上游 IncludedRelationsForRow 未传 NsId），
  // 直接把 row.device 交给 createServerFn 会被可序列化校验拒掉。
  return {
    device: device
      ? {
          id: device.id,
          name: device.name,
          platform: device.platform,
          userAgent: device.userAgent,
          ip: device.ip,
          lastSeenAt: device.lastSeenAt,
          createdAt: device.createdAt,
        }
      : null,
    session: session
      ? {
          id: session.id,
          sessionVersion: session.sessionVersion,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        }
      : null,
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

  // 踢掉该用户所有 WebSocket 连接
  kickAllSessionsForUser(user.id);

  return { success: true as const };
});
