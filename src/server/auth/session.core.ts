import crypto from "node:crypto";

/**
 * Session module 的 internal seam：纯函数核心，无 DB、无请求上下文。
 * 供单元测试直接打到；公开 interface 在 session.ts。
 */

/** 生成会话令牌：32 字节随机数，base64url 编码（43 字符）。 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** 会话令牌的 sha256 hex 哈希。数据库只保存它，不保存令牌本身。 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
