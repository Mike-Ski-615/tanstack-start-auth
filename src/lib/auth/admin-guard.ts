/**
 * 管理员接口的准入检查。
 *
 * **这是全项目第一处基于 role 的服务端校验。** 在此之前 `role` 只用于
 * 前端路由重定向 —— 意味着任何登录用户都能调用任何 serverFn。管理接口
 * 一旦漏掉这个检查，学生就能直接请求接口拿到全部用户邮箱、改任何人角色、
 * 删任何人账号。前端隐藏菜单**不是**访问控制。
 *
 * 每个 admin 接口的第一行都必须是 `await requireAdmin()`。
 */
import { getCurrentUser } from "./guard";
import type { User } from "./current-user";
import { ERROR_MESSAGE } from "#lib/error-messages";

/**
 * 权限不足时抛出的错误。
 *
 * 直接是用户可读文案 —— 按 react-query 的约定，服务端抛出的
 * error.message 会被界面直接展示（见 lib/error-messages.ts）。
 */
export const FORBIDDEN = ERROR_MESSAGE.FORBIDDEN;

/**
 * 要求当前会话属于 admin，否则抛错。
 *
 * 返回当前管理员 —— 调用方常需要知道「谁在操作」（比如禁止改自己）。
 */
export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();

  // 未登录与权限不足用同一个错误码：不区分「你没登录」和「你不够格」，
  // 避免给探测者额外信息。
  if (!user || user.role !== "admin") {
    throw new Error(FORBIDDEN);
  }

  return user;
}
