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
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * 读取当前请求的 Session。
 *
 * 无 cookie、令牌无效、Session 已撤销或已过期时返回 null。
 */
export async function readSession() {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const session = await db.orm.public.Session.where({
    tokenHash: hashSessionToken(token),
  }).first();

  if (!session || session.revokedAt !== null) {
    return null;
  }

  if (new Date(session.expiresAt) <= new Date()) {
    return null;
  }

  return session;
}

/** Session 行（服务端使用，如登出需要的 session.id）。 */
export type Session = NonNullable<Awaited<ReturnType<typeof readSession>>>;

/**
 * 撤销指定 Session 并清除会话 cookie。
 */
export async function endSession(sessionId: Char<36>): Promise<void> {
  await db.orm.public.Session.where({ id: sessionId }).update({
    revokedAt: new Date().toISOString(),
  });

  deleteCookie(SESSION_COOKIE, { path: "/", secure: true, sameSite: "lax" });
}
