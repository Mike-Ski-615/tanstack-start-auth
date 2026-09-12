import * as v from "valibot";
import { MANAGED_ROLES } from "#lib/auth/current-user";

const emailField = v.pipe(v.string(), v.minLength(1, "请输入邮箱"), v.email("邮箱格式不正确"));
const passwordField = v.pipe(
  v.string(),
  v.minLength(6, "密码至少 6 位"),
  v.maxLength(32, "密码最多 32 位"),
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
  bio: v.pipe(v.string(), v.maxLength(200, "简介最多 200 个字符")),
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

export const verifyEmailOtpSchema = v.object({
  email: emailField,
  otp: otpField,
});

export const userIdSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

export const adminSetRoleSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  role: v.picklist(MANAGED_ROLES),
});

export const adminResetPasswordSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  password: passwordField,
});

export const adminUpdateProfileSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "请输入用户名"),
    v.maxLength(50, "用户名最多 50 个字符"),
  ),
  bio: v.pipe(v.string(), v.maxLength(200, "简介最多 200 个字符")),
});

export type LoginValues = v.InferOutput<typeof loginSchema>;
export type RegisterValues = v.InferOutput<typeof registerSchema>;
export type EmailOnlyValues = v.InferOutput<typeof emailOnlySchema>;
type UpdateProfileValues = v.InferOutput<typeof updateProfileSchema>;
type ChangePasswordValues = v.InferOutput<typeof changePasswordSchema>;
export { type UpdateProfileValues, type ChangePasswordValues };
export type UserIdValues = v.InferOutput<typeof userIdSchema>;
export type AdminSetRoleValues = v.InferOutput<typeof adminSetRoleSchema>;
export type AdminResetPasswordValues = v.InferOutput<typeof adminResetPasswordSchema>;
export type AdminUpdateProfileValues = v.InferOutput<typeof adminUpdateProfileSchema>;

const internalLinkField = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(500, "链接最多 500 个字符"),
  v.check(
    (link) => link === "" || (/^\//.test(link) && !/^\/\//.test(link)),
    "链接必须是站内路径（以 / 开头）",
  ),
);

export const NOTIFICATION_TITLE_MAX = 100;
export const NOTIFICATION_BODY_MAX = 1000;

export const sendNotificationSchema = v.object({
  title: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "请输入标题"),
    v.maxLength(NOTIFICATION_TITLE_MAX, `标题最多 ${NOTIFICATION_TITLE_MAX} 个字符`),
  ),
  body: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "请输入内容"),
    v.maxLength(NOTIFICATION_BODY_MAX, `内容最多 ${NOTIFICATION_BODY_MAX} 个字符`),
  ),
  link: v.optional(internalLinkField),
  all: v.optional(v.boolean()),
  roles: v.optional(v.array(v.picklist(MANAGED_ROLES))),
  userIds: v.optional(v.array(v.pipe(v.string(), v.minLength(1)))),
});

export const notificationRecipientIdSchema = v.object({
  recipientId: v.pipe(v.string(), v.minLength(1)),
});

export const notificationBatchIdSchema = v.object({
  notificationId: v.pipe(v.string(), v.minLength(1)),
});

export type SendNotificationValues = v.InferOutput<typeof sendNotificationSchema>;

export const notificationPrefsSchema = v.object({
  notifyOnNewMessage: v.boolean(),
});
