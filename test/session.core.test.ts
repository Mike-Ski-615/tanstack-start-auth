import { describe, expect, test } from "bun:test";

import {
  generateSessionToken,
  hashSessionToken,
} from "../src/server/auth/session.core";

describe("generateSessionToken", () => {
  test("43 字符 base64url（32 字节随机数）", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  test("连续调用互不相同", () => {
    const tokens = Array.from({ length: 100 }, () => generateSessionToken());
    expect(new Set(tokens).size).toBe(100);
  });
});

describe("hashSessionToken", () => {
  test("确定性：同输入同输出，64 位 hex", () => {
    const token = generateSessionToken();
    const h1 = hashSessionToken(token);
    const h2 = hashSessionToken(token);

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  test("不同 token 不同哈希", () => {
    const h1 = hashSessionToken(generateSessionToken());
    const h2 = hashSessionToken(generateSessionToken());

    expect(h1).not.toBe(h2);
  });
});
