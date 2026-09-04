import { argon2id, argon2Verify } from "hash-wasm";

/**
 * Argon2id 密码哈希。
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: crypto.getRandomValues(new Uint8Array(16)),

    iterations: 3,
    parallelism: 1,
    memorySize: 64 * 1024, // 64 MiB

    hashLength: 32,
    outputType: "encoded",
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
