import { argon2id, argon2Verify } from "hash-wasm";

/** Argon2id：哈希密码（编码型，自带随机盐）。 */
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

/** 用存储的哈希校验明文密码。 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2Verify({ password, hash: passwordHash });
}
