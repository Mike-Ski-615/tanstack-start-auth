/**
 * CurrentUser —— 当前登录用户的唯一公开形态（见 CONTEXT.md）。
 *
 * 投影发生在查询层（PUBLIC_COLUMNS），passwordHash 等存储层字段不进入查询结果。
 *
 * 这是一个叶子模块：不 import auth 链上的任何东西。
 * guard / session-manager / user.functions 都要用它，放在这里才不会形成
 * `session-manager → user.functions → guard → session-manager` 的运行时循环。
 */

/** 公开字段列表，凡是要投影出 CurrentUser 的地方都用它。 */
export const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "image",
  "bio",
  "role",
  "createdAt",
  "status",
  "sessionVersion",
  "emailVerifiedAt",
] as const;

export type User = {
  id: string;
  email: string;
  name: string;
  image: string;
  bio: string;
  role: "teacher" | "student";
  createdAt: string;
  status: "online" | "offline";
  sessionVersion: number;
  emailVerifiedAt: string | null;
};
