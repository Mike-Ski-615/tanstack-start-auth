import { argon2id, argon2Verify } from "hash-wasm";

const SALT_LENGTH = 16;
const HASH_LENGTH = 32;
const MEMORY_SIZE = 65_536;
const TIME_COST = 3;
const PARALLELISM = 4;

/**
 * Argon2id password hashing.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  return argon2id({
    password,
    salt,
    iterations: TIME_COST,
    parallelism: PARALLELISM,
    memorySize: MEMORY_SIZE,
    hashLength: HASH_LENGTH,
    outputType: "encoded",
  });
}

/**
 * Verify a password against an Argon2id hash.
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return argon2Verify({ password, hash: passwordHash });
}
