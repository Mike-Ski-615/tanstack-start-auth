import z from "zod";

const emailField = z
  .string()
  .min(1, "请输入邮箱")
  .pipe(z.email("邮箱格式不正确"));
const passwordField = z
  .string()
  .min(6, "密码至少 6 位")
  .max(32, "密码最多 32 位");

/** 6 位数字验证码。 */
const otpField = z.string().regex(/^\d{6}$/, "验证码为 6 位数字");

export const loginSchema = z.object({
  email: emailField,
  password: passwordField,
});

export const registerSchema = z.object({
  name: z.string().min(1, "请输入用户名").max(50, "用户名最多 50 个字符"),
  email: emailField,
  password: passwordField,
});

export const emailOnlySchema = z.object({
  email: emailField,
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "请输入用户名")
    .max(50, "用户名最多 50 个字符"),
  bio: z.string().max(200, "简介最多 200 个字符"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "请输入当前密码"),
  newPassword: passwordField,
});

export const resetPasswordSchema = z.object({
  email: emailField,
  otp: otpField,
  password: passwordField,
});

export const verifyEmailOtpSchema = z.object({
  email: emailField,
  otp: otpField,
});

/** 按 id 取任意用户的公开形态。 */
export const userIdSchema = z.object({
  userId: z.string().min(1),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;
type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export { type UpdateProfileValues, type ChangePasswordValues };
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailOtpValues = z.infer<typeof verifyEmailOtpSchema>;
export type UserIdValues = z.infer<typeof userIdSchema>;
