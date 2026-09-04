import { jwtVerify, SignJWT } from "jose";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

/**
 * 自包含用户令牌深模块：签发/验签一枚 HS256 JWT，其 sub 即 userId。
 * 复用 SESSION_SECRET 签名，不落库；验签即验身份与时效。
 *
 * jose 只接受字节数组/KeyObject 作 key（KeyInput），不接受裸字符串，
 * 故用 TextEncoder 把 SESSION_SECRET 转字节；HS256 密钥不宜短于 32 字节。
 */
const SESSION_KEY = new TextEncoder().encode(process.env.SESSION_SECRET!);

/** 令牌有效期。 */
const TTL = "15m";

/** 签一枚 TTL 有效、sub 指向该 userId 的无状态 JWT。 */
export async function signUserToken(userId: Char<36>): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(SESSION_KEY);
}

/** 验签（HS256，固定算法防降级）+ 时效。tokens 自动核实 exp；无效/过期返回 null。 */
export async function readUserToken(
  token: string,
): Promise<Char<36> | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_KEY, {
      algorithms: ["HS256"],
    });
    const { sub } = payload;
    return typeof sub === "string" ? (sub as Char<36>) : null;
  } catch {
    return null; // 过期/篡改/算法不符 → 一律视为无效
  }
}
