import * as v from "valibot";

const emailField = v.pipe(v.string(), v.minLength(1, "请输入邮箱"), v.email("邮箱格式不正确"));
const passwordField = v.pipe(
  v.string(),
  v.minLength(8, "密码至少 8 位"),
  v.maxLength(128, "密码最多 128 位"),
);

const otpField = v.pipe(v.string(), v.regex(/^\d{6}$/, "验证码为 6 位数字"));

export const loginSchema = v.object({
  email: emailField,
  password: passwordField,
});

export const registerSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "请输入用户名"), v.maxLength(50, "用户名最多 50 个字符")),
  email: emailField,
  password: passwordField,
});

export const emailOnlySchema = v.object({
  email: emailField,
});

export const updateProfileSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "请输入用户名"),
    v.maxLength(50, "用户名最多 50 个字符"),
  ),
});

export const changePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.minLength(1, "请输入当前密码")),
  newPassword: passwordField,
});

export const resetPasswordSchema = v.object({
  email: emailField,
  otp: otpField,
  password: passwordField,
});

export type LoginValues = v.InferOutput<typeof loginSchema>;
export type RegisterValues = v.InferOutput<typeof registerSchema>;
export type EmailOnlyValues = v.InferOutput<typeof emailOnlySchema>;
export type UpdateProfileValues = v.InferOutput<typeof updateProfileSchema>;
export type ChangePasswordValues = v.InferOutput<typeof changePasswordSchema>;
