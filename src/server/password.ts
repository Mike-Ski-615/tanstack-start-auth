import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2id 密码哈希。
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: crypto.getRandomValues(new Uint8Array(16)),
    iterations: 2, // OWASP 最低配置：19 MiB / t=2 / p=1
    parallelism: 1,
    memorySize: 19_456, // 19 MiB
    hashLength: 32,
    outputType: "encoded", // 参数与盐内嵌结果串，verify 自包含
  });
}

/**
 * 校验密码是否匹配 Argon2id 哈希。
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2Verify({ password, hash: passwordHash });
}
