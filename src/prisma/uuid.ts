import type { Char } from "@prisma/orm-postgres/target/codec-types";

/**
 * string → Char<36> 的唯一强转接缝。
 *
 * Char<36> 是 Prisma 的编译期品牌类型（string 的子类型），
 * ORM 边界（where/create 的 uuid 字段）无法避开它。
 * 本函数把品牌隔离在这一个模块里：应用层与测试的签名
 * 统一使用普通 string，只在进入 ORM 边界处调用 uuid()。
 *
 * 注意：不做格式校验——调用方的入均来自服务端写入的会话数据
 * 或数据库行（天然合法 UUID）；若未来出现外部不可信输入，
 * 应先校验再调用。
 */
export function uuid(value: string): Char<36> {
  return value as Char<36>;
}
