/**
 * 改密并重建会话。
 *
 * 由 changePassword（已登录，验当前密码）与 resetPassword（未登录，验 OTP）
 * 共用 —— 两条路径的前置校验完全不同，但尾部三步是一样的，且**顺序有安全含义**。
 *
 * 为什么单独一个文件：它天然横跨 password / session / db 三者 —— 放进
 * password.ts 会让那个纯函数模块开始依赖数据库与会话；放进 session-manager
 * 则会让它第一次碰 User.passwordHash 字段，而那正是把重置 OTP 移出去时
 * 想收窄的职责面。
 */

import { db } from "#prisma/db";
import { hashPassword } from "#lib/auth/password";
import { invalidateAllSessions, signIn } from "#lib/auth/session-manager";

/**
 * 把用户的密码换成新密码，并重建会话（自动登录）。
 *
 * **顺序不能改**：无多语句 transaction 的前提下采用 fail-closed ——
 * 先失效所有旧会话，再写新哈希，最后建新会话。
 *
 * 若 invalidateAllSessions 失败，密码不会被修改：用户被登出，但密码仍然
 * 是旧的、安全的。反过来（先改密码再失效）则会出现「密码已换、旧会话
 * 仍有效」的窗口 —— 攻击者持有的旧 token 还能继续用。
 *
 * 这个约束以前只写在 CONTEXT.md 的「Fail-Closed 顺序」一节里，两个调用点
 * 各自照做。搬进代码后它由实现强制，不再靠人记住。
 */
export async function rotatePassword(userId: string, newPassword: string): Promise<void> {
  // 1. 先失效 —— 失败则整个操作中止，密码不动
  await invalidateAllSessions(userId);

  // 2. 再改密码
  await db.orm.public.User.where({ id: userId }).update({
    passwordHash: await hashPassword(newPassword),
  });

  // 3. 最后建新会话（递增后的 sessionVersion 会让新建的这条与 User 对齐）
  await signIn(userId);
}
