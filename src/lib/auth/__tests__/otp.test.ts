import { describe, it, expect } from "vitest";
import {
  generateOtp,
  hashOtp,
  isValidOtpFormat,
  MAX_OTP_ATTEMPTS,
} from "#lib/auth/otp";

describe("generateOtp", () => {
  it("生成的验证码长度恒为 6", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateOtp()).toHaveLength(6);
    }
  });

  it("只包含数字", () => {
    for (let i = 0; i < 500; i++) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  // 关键回归点：randomInt(0, 1_000_000) 可能返回 < 100000，
  // 少了 padStart 就会得到 "1234" 这种 4 位码，用户永远输不对。
  it("小数值补前导零而非缩短长度", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) {
      const otp = generateOtp();
      seen.add(otp);
      expect(otp).toHaveLength(6);
    }
    // 2 万次采样里首位为 0 的概率约 10%，必然出现（否则说明补零没生效）
    expect([...seen].some((o) => o.startsWith("0"))).toBe(true);
  });

  it("分布大致均匀（首位数字不应集中在某个值）", () => {
    const buckets = new Array(10).fill(0);
    const N = 20_000;
    for (let i = 0; i < N; i++) buckets[Number(generateOtp()[0])]++;
    const expected = N / 10;
    for (const count of buckets) {
      // ±25% 容差，足以抓出 Math.random 误用之类的分布异常
      expect(count).toBeGreaterThan(expected * 0.75);
      expect(count).toBeLessThan(expected * 1.25);
    }
  });

  it("连续生成不重复（不是常量或弱随机）", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateOtp()));
    expect(set.size).toBeGreaterThan(990);
  });
});

describe("hashOtp", () => {
  it("同一输入产出稳定哈希", () => {
    expect(hashOtp("123456")).toBe(hashOtp("123456"));
  });

  it("不同输入产出不同哈希", () => {
    expect(hashOtp("123456")).not.toBe(hashOtp("654321"));
    // 前导零不能被忽略："012345" 与 "12345" 不是同一个码
    expect(hashOtp("012345")).not.toBe(hashOtp("12345"));
  });

  it("输出为 64 位十六进制（SHA-256）", () => {
    expect(hashOtp("000000")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("不泄露原文", () => {
    expect(hashOtp("123456")).not.toContain("123456");
  });
});

describe("isValidOtpFormat", () => {
  it("接受恰好 6 位数字", () => {
    expect(isValidOtpFormat("000000")).toBe(true);
    expect(isValidOtpFormat("123456")).toBe(true);
    expect(isValidOtpFormat("999999")).toBe(true);
  });

  it("拒绝长度不符", () => {
    expect(isValidOtpFormat("12345")).toBe(false);
    expect(isValidOtpFormat("1234567")).toBe(false);
    expect(isValidOtpFormat("")).toBe(false);
  });

  it("拒绝非数字字符", () => {
    expect(isValidOtpFormat("12345a")).toBe(false);
    expect(isValidOtpFormat("12 456")).toBe(false);
    expect(isValidOtpFormat("12-456")).toBe(false);
    expect(isValidOtpFormat("１２３４５６")).toBe(false); // 全角
  });

  it("拒绝含空白或正负号", () => {
    expect(isValidOtpFormat(" 123456")).toBe(false);
    expect(isValidOtpFormat("123456 ")).toBe(false);
    expect(isValidOtpFormat("+12345")).toBe(false);
    expect(isValidOtpFormat("1e3456")).toBe(false);
  });
});

describe("MAX_OTP_ATTEMPTS", () => {
  // 6 位数字只有 100 万种组合。上限设得过大等于没有防护，
  // 设成 1 又会让手误的用户频繁重来。
  it("是能防暴力又不过严的合理值", () => {
    expect(MAX_OTP_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(MAX_OTP_ATTEMPTS).toBeLessThanOrEqual(10);
  });

  // 100 万 / 5 次 = 需要 20 万个不同 OTP 才能保证撞开一次，
  // 配合重发限速后实际不可行。
  it("配合 6 位空间，撞开概率可忽略", () => {
    const spaceSize = 10 ** 6;
    const successPerOtp = MAX_OTP_ATTEMPTS / spaceSize;
    expect(successPerOtp).toBeLessThan(0.00001);
  });
});
