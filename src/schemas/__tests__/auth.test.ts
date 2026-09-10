import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  emailOnlySchema,
  resetPasswordSchema,
  verifyEmailOtpSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "#schemas/auth";

/** zod 校验是否通过。 */
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

describe("email 校验（各 schema 共用 emailField）", () => {
  it("接受合法邮箱", () => {
    expect(ok(emailOnlySchema, { email: "a@b.com" })).toBe(true);
    expect(ok(emailOnlySchema, { email: "user.name+tag@example.co.uk" })).toBe(true);
  });

  it("拒绝空值与非法格式", () => {
    expect(ok(emailOnlySchema, { email: "" })).toBe(false);
    expect(ok(emailOnlySchema, { email: "notanemail" })).toBe(false);
    expect(ok(emailOnlySchema, { email: "@b.com" })).toBe(false);
    expect(ok(emailOnlySchema, { email: "a@" })).toBe(false);
  });
});

describe("passwordField 边界", () => {
  it("接受 6~32 位", () => {
    expect(ok(loginSchema, { email: "a@b.com", password: "123456" })).toBe(true);
    expect(ok(loginSchema, { email: "a@b.com", password: "a".repeat(32) })).toBe(true);
  });

  it("拒绝过短或过长", () => {
    expect(ok(loginSchema, { email: "a@b.com", password: "12345" })).toBe(false);
    expect(ok(loginSchema, { email: "a@b.com", password: "a".repeat(33) })).toBe(false);
  });
});

describe("registerSchema", () => {
  it("接受完整合法输入", () => {
    expect(
      ok(registerSchema, {
        name: "张三",
        email: "a@b.com",
        password: "123456",
      }),
    ).toBe(true);
  });

  it("name 不能为空或超长", () => {
    expect(ok(registerSchema, { name: "", email: "a@b.com", password: "123456" })).toBe(false);
    expect(
      ok(registerSchema, {
        name: "x".repeat(51),
        email: "a@b.com",
        password: "123456",
      }),
    ).toBe(false);
  });
});

describe("verifyEmailOtpSchema / resetPasswordSchema 的 OTP 字段", () => {
  it("接受 6 位数字", () => {
    expect(ok(verifyEmailOtpSchema, { email: "a@b.com", otp: "000000" })).toBe(true);
    expect(
      ok(resetPasswordSchema, {
        email: "a@b.com",
        otp: "123456",
        password: "123456",
      }),
    ).toBe(true);
  });

  // 不要 token 了，传了应该被忽略（而非报错）—— 确认已彻底切换到 OTP
  it("拒绝非 6 位数字的 otp", () => {
    expect(ok(verifyEmailOtpSchema, { email: "a@b.com", otp: "12345" })).toBe(false);
    expect(ok(verifyEmailOtpSchema, { email: "a@b.com", otp: "1234567" })).toBe(false);
    expect(ok(verifyEmailOtpSchema, { email: "a@b.com", otp: "abcdef" })).toBe(false);
    expect(ok(verifyEmailOtpSchema, { email: "a@b.com", otp: "" })).toBe(false);
  });

  it("resetPasswordSchema 同时要求 otp 和新密码", () => {
    expect(ok(resetPasswordSchema, { email: "a@b.com", otp: "123456" })).toBe(false);
    expect(
      ok(resetPasswordSchema, {
        email: "a@b.com",
        otp: "123456",
        password: "12345",
      }),
    ).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("name 会 trim，纯空白视为空", () => {
    const r = updateProfileSchema.safeParse({ name: "   ", bio: "" });
    expect(r.success).toBe(false);
  });

  it("bio 上限 200", () => {
    expect(ok(updateProfileSchema, { name: "a", bio: "x".repeat(200) })).toBe(true);
    expect(ok(updateProfileSchema, { name: "a", bio: "x".repeat(201) })).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("当前密码不能为空", () => {
    expect(ok(changePasswordSchema, { currentPassword: "", newPassword: "123456" })).toBe(false);
  });

  it("新密码须符合长度要求", () => {
    expect(
      ok(changePasswordSchema, {
        currentPassword: "old123",
        newPassword: "12345",
      }),
    ).toBe(false);
    expect(
      ok(changePasswordSchema, {
        currentPassword: "old123",
        newPassword: "123456",
      }),
    ).toBe(true);
  });
});
