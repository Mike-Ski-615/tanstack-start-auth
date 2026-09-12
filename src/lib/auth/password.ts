import { argon2id, argon2Verify } from "hash-wasm";

const WEAK = process.env["ARGON2_TEST_WEAK"] === "1";

const PARAMS = WEAK
  ? {
      iterations: 1,
      parallelism: 1,
      memorySize: 8,
      saltLength: 8,
      hashLength: 16,
    }
  : {
      iterations: 3,
      parallelism: 1,
      memorySize: 64 * 1024,
      hashLength: 32,
    };

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: crypto.getRandomValues(new Uint8Array(WEAK ? 8 : 16)),
    ...PARAMS,
    outputType: "encoded",
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return argon2Verify({ password, hash: passwordHash });
}
