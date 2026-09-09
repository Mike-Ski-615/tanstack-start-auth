import { createHash, randomBytes } from "node:crypto";

/** 生成 32 字节随机令牌，hex 编码后存 cookie。 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** SHA-256 哈希：DB 只存哈希，泄露也不可直接使用。 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
