import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2 参数。
 *
 * 生产用 OWASP 推荐级别（3 轮 / 64 MiB）。测试可通过 ARGON2_TEST_WEAK=1
 * 降到最低强度 —— 单个哈希从 ~130ms 降到 ~1ms。
 *
 * 为什么可以这样降：测试断言的是「密码怎么被用」而不是「哈希有多难算」，
 * 强度参数不参与任何逻辑分支。而 verifyPassword 从存储的哈希里读参数，
 * 所以 hash 降下来 verify 也跟着降，不需两边同步。
 *
 * 默认不降 —— 环境变量没设时行为与从前完全一致，生产不受影响。
 */
const WEAK = process.env["ARGON2_TEST_WEAK"] === "1";

const PARAMS = WEAK
  ? {
      iterations: 1,
      parallelism: 1,
      memorySize: 8, // 8 KiB，argon2 允许的最小值
      saltLength: 8,
      hashLength: 16,
    }
  : {
      iterations: 3,
      parallelism: 1,
      memorySize: 64 * 1024, // 64 MiB
      hashLength: 32,
    };

/** Argon2id：哈希密码（编码型，自带随机盐）。 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: crypto.getRandomValues(new Uint8Array(WEAK ? 8 : 16)),
    ...PARAMS,
    outputType: "encoded",
  });
}

/** 用存储的哈希校验明文密码。 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2Verify({ password, hash: passwordHash });
}
