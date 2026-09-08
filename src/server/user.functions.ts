import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { z } from "zod";
import { db } from "#prisma/db";
import { useAppSession } from "#lib/auth/session";

/**
 * 当前登录用户的唯一公开形态：投影发生在源头，passwordHash 不出本模块。
 *
 * id 声明为 Char<36>（品牌类型，运行时就是普通 string），
 * 从 ORM 查询一路贯穿到客户端路由 context，无需转换。
 */
export type User = {
  id: Char<36>;
  email: string;
  name: string;
  image: string;
  bio: string;
  role: "teacher" | "student";
  createdAt: string;
  status: "online" | "offline";
  connectedAt: string | null;
  disconnectedAt: string | null;
};

/** 公开字段列表，getUserFn 与 getUserById 共用同一投影。 */
const PUBLIC_COLUMNS = [
  "id",
  "email",
  "name",
  "image",
  "bio",
  "role",
  "createdAt",
  "status",
  "connectedAt",
  "disconnectedAt",
] as const;

async function loadPublicUser(userId: Char<36>) {
  return db.orm.public.User.where({ id: userId })
    .select(...PUBLIC_COLUMNS)
    .first();
}

/**
 * 当前登录用户（文档模式）：从会话读 userId → 查库 → 返回公开形态。
 *
 * 投影发生在查询层，passwordHash 永不离开服务端。
 * 无会话或用户不存在均返回 null。
 */
export const getUserFn = createServerFn({
  method: "GET",
}).handler(async (): Promise<User | null> => {
  // 个性化响应依赖当前会话，禁止任何缓存（登出/换号后不该吃到旧 user）
  setResponseHeader("Cache-Control", "no-store");

  const session = await useAppSession();
  const userId = session.data.userId;

  if (!userId) return null;

  return loadPublicUser(userId);
});

const userIdSchema = z.object({
  userId: z.string().min(1),
});

/**
 * 按 id 取任意用户的公开形态（含 basic + 在线态），
 * /authenticated/users/$userId 用它来渲染目标用户主页。
 *
 * 只要求"已登录"即可查（会话无自界→任何登录用户可见任意用户）。
 */
export const getUserById = createServerFn({
  method: "GET",
})
  .validator(userIdSchema)
  .handler(async ({ data }): Promise<User | null> => {
    const session = await useAppSession();
    if (!session.data.userId) return null;

    return loadPublicUser(data.userId as Char<36>);
  });
