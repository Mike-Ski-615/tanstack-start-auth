/**
 * 管理员接口的准入检查。
 *
 * **这是全项目第一处基于 role 的服务端校验。** 在此之前 `role` 只用于
 * 前端路由重定向 —— 意味着任何登录用户都能调用任何 serverFn。管理接口
 * 一旦漏掉这个检查，学生就能直接请求接口拿到全部用户邮箱、改任何人角色、
 * 删任何人账号。前端隐藏菜单**不是**访问控制。
 *
 * 每个 admin 接口的第一行都必须是 `await requireAdmin()`。
 *
 * ## 这条约定为何还靠人记
 *
 * 它本来应该由类型系统保证：把 `requireAdmin()` 改成
 * `createMiddleware().server()` 中间件，漏挂就读不到 `context.user`，编译不过。
 * 那条路**试过且撤回了** —— 不是设计问题，是当时它无法被回归网看见：
 *
 * 测试直调 serverFn 走的是 client 存根路径（`executeMiddleware(..., "client")`），
 * 而 `.server()` 中间件在 client 路径上一条都不执行 —— 于是每一个鉴权用例
 * 都变成「调用成功」，测试全绿而鉴权实际上没跑。
 *
 * 这个障碍**已经修掉**（见 vitest.config.ts 与 src/test/request.ts：测试现在
 * 经编译后的服务端实现模块 `*?tss-serverfn-split` 调用，`.server()` 中间件与
 * validator 都真实执行）。所以中间件化现在是**可测的** —— 只是还没做。
 * 要做的话，12 个调用点与这个文件里的 `requireAdmin()` 一起换成
 * `.middleware([...])`，并删掉此文件的函数版本（两套并存等于留了一条
 * 绕过中间件的写法）。
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
