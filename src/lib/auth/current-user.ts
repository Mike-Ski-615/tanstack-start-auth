/**
 * CurrentUser —— 当前登录用户的唯一公开形态（见 CONTEXT.md）。
 *
 * 投影发生在查询层（PUBLIC_COLUMNS），passwordHash 等存储层字段不进入查询结果。
 *
 * 这是一个叶子模块：不 import auth 链上的任何东西。
 * guard / session-manager / user.functions 都要用它，放在这里才不会形成
 * `session-manager → user.functions → guard → session-manager` 的运行时循环。
 */

/**
 * 公开字段列表，凡是要投影出 CurrentUser 的地方都用它。
 */
export const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "image",
  "bio",
  "role",
  "createdAt",
  "sessionVersion",
  "emailVerifiedAt",
] as const;

/**
 * 角色。
 *
 * 与 prisma/contract.ts 的 Role enum 必须一致 —— 那边是数据库契约，
 * 这边是应用层类型，两处都改才算改完。
 *
 * `teacher` 在权限上等同管理员（最高 role），但名字是业务角色。
 * `admin` 目前只是预留：它不比其他角色多任何权限，仅用于将来接入
 * 管理功能时有个落点。详见 CONTEXT.md。
 */
export const ROLES = ["student", "teacher", "admin"] as const;

export type Role = (typeof ROLES)[number];

/** 各角色登录后默认落在哪个工作台。路由重定向与页内守卫共用此表。 */
export const ROLE_HOME: Record<Role, string> = {
  student: "/authenticated/student",
  teacher: "/authenticated/teacher",
  admin: "/authenticated/admin",
};

export type User = {
  id: string;
  email: string;
  name: string;
  image: string;
  bio: string;
  role: Role;
  createdAt: string;
  sessionVersion: number;
  emailVerifiedAt: string | null;
};
