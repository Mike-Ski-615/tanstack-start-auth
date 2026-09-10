import { describe, it, expect } from "vitest";
import { generateToken, hashToken, generateDeviceKey } from "#lib/auth/token";

describe("generateToken", () => {
  it("是 64 位十六进制（32 字节熵）", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateToken()).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("不重复", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateToken()));
    expect(set.size).toBe(1000);
  });
});

describe("hashToken", () => {
  it("稳定且不可逆", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("不同输入不同输出", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateDeviceKey", () => {
  it("是 base64url 且长度合理（32 字节 → 43 字符）", () => {
    for (let i = 0; i < 100; i++) {
      const key = generateDeviceKey();
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(key).toHaveLength(43);
    }
  });

  it("不含 base64 的 +/= 字符（URL/cookie 安全）", () => {
    for (let i = 0; i < 200; i++) {
      const key = generateDeviceKey();
      expect(key).not.toContain("+");
      expect(key).not.toContain("/");
      expect(key).not.toContain("=");
    }
  });

  it("不重复", () => {
    const set = new Set(Array.from({ length: 500 }, () => generateDeviceKey()));
    expect(set.size).toBe(500);
  });
});
