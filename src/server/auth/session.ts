import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

import { generateSessionToken, hashSessionToken } from "./session.core";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

/**
 * 撤销指定 Session 并清除会话 cookie。
 */
export async function endSession(sessionId: Char<36>): Promise<void> {
  await db.orm.public.Session.where({ id: sessionId }).update({
    revokedAt: new Date().toISOString(),
  });

  deleteCookie(SESSION_COOKIE, { path: "/", secure: true, sameSite: "lax" });
}
