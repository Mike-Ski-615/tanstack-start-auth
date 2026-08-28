import crypto from "node:crypto";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** 生成会话令牌：32 字节随机数，base64url 编码（43 字符）。 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** 会话令牌的 sha256 hex 哈希。数据库只保存它，不保存令牌本身。 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const SESSION_COOKIE = "__Host-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/** 会话 cookie 的共享属性：签发与清除必须一致（__Host- 前缀要求 path=/）。 */
const SESSION_COOKIE_OPTIONS = {
  secure: true,
  sameSite: "lax",
  path: "/",
} as const;

/**
 * 为某 User 签发 Session。
 *
 * 不变量——签发即顶替（单设备）：该用户所有现存活跃 Session 先被撤销，
 * 再创建新 Session 并写入会话 cookie。传入 tx 时参与调用方事务
 * （如注册时与建用户同事务），否则自开事务。
 */
export async function issueSession(userId: Char<36>, tx?: Tx): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  const now = new Date().toISOString();

  const issue = async (conn: Tx) => {
    // 顺手清理该用户已过期的会话行，防止死数据无限堆积
    await conn.orm.public.Session.where({ userId })
      .where((f) => f.expiresAt.lt(now))
      .delete();
    await conn.orm.public.Session.where({ userId, revokedAt: null }).update({
      revokedAt: now,
    });
    await conn.orm.public.Session.create({ tokenHash, userId, expiresAt });
  };

  if (tx) {
    await issue(tx);
  } else {
    await db.transaction(issue);
  }

  setCookie(SESSION_COOKIE, token, {
    ...SESSION_COOKIE_OPTIONS,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * 读取当前请求的 Session，join 携带 user 的公开字段（一次查询）。
 *
 * select 分支即投影边界：passwordHash 等存储层字段不进入查询结果。
 * 无 cookie、令牌无效、Session 已撤销或已过期时返回 null。
 */
export async function readSession() {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const session = await db.orm.public.Session.where({
    tokenHash: hashSessionToken(token),
  })
    .include("user", (user) =>
      user.select("id", "email", "name", "image", "bio"),
    )
    .first();

  if (!session || session.revokedAt !== null) {
    return null;
  }

  if (new Date(session.expiresAt) <= new Date()) {
    return null;
  }

  return session;
}

type SessionWithUser = NonNullable<Awaited<ReturnType<typeof readSession>>>;

/** Session 行（服务端使用，如登出需要的 session.id）。不含 user。 */
export type Session = Omit<SessionWithUser, "user">;

/**
 * 撤销指定 Session 并清除会话 cookie。
 */
export async function endSession(sessionId: Char<36>): Promise<void> {
  await db.orm.public.Session.where({ id: sessionId }).update({
    revokedAt: new Date().toISOString(),
  });

  deleteCookie(SESSION_COOKIE, SESSION_COOKIE_OPTIONS);
}
