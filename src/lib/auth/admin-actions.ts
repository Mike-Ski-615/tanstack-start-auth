/**
 * 管理员重置他人密码。
 *
 * 与 password-rotation.ts 的 rotatePassword 的区别（两者不能互相替代）：
 *
 *   rotatePassword     —— 本人操作（改密 / 忘记密码重置）。尾部会
 *                         `signIn(userId)` 给自己建新会话（自动登录）。
 *   adminResetPassword —— 管理员操作他人。**不能**调 signIn：那会给
 *                         管理员建一个属于受害者的会话，等于管理员登录成
 *                         受害者。只失效、不重建。
 *
 * 顺序沿用 fail-closed：先失效旧会话，再写新哈希。若先改密码后失效，
 * 会出现「密码已换、攻击者手里的旧 token 仍有效」的窗口。
 */

import { db } from "#prisma/db";
import { PUBLIC_COLUMNS, type ManagedRole, type User } from "./current-user";
import { hashPassword } from "./password";
import { invalidateAllSessions } from "./session-manager";

/**
 * 列出某个可管理角色的全部用户（按注册时间倒序）。
 *
 * 抽成普通函数而非写在 serverFn 里：serverFn 的返回值在测试里拿不到
 * （__executeServer 把结果写进响应流，不经过返回值），而列表测试必须
 * 断言返回内容。查询放在这里就能直测。
 */
export async function listManagedUsers(role: ManagedRole): Promise<User[]> {
  return db.orm.public.User.where((u) => u.role.eq(role))
    .select(...PUBLIC_COLUMNS)
    .orderBy((u) => u.createdAt.desc())
    .all();
}

/**
 * 管理员把目标用户的密码换成新密码，并踢掉该用户的所有会话。
 *
 * 不做自动登录 —— 受害者需要用新密码自己去登录。
 */
export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  // 1. 先失效所有会话（旧 token 立刻作废）
  await invalidateAllSessions(userId);

  // 2. 再写新哈希
  await db.orm.public.User.where({ id: userId }).update({
    passwordHash: await hashPassword(newPassword),
  });
}
