import z from "zod";

const emailField = z.string().min(1, "请输入邮箱").pipe(z.email("邮箱格式不正确"));
const passwordField = z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位");

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
  name: z.string().trim().min(1, "请输入用户名").max(50, "用户名最多 50 个字符"),
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

// ============================================================
// 管理员操作（仅 admin 可调用，校验在 server fn 里做）
// ============================================================

/** 管理员改目标用户的角色。只允许改成非 admin 值 —— 见 admin.functions.ts。 */
export const adminSetRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["student", "teacher"]),
});

/** 管理员重置目标用户的密码（不需要旧密码 —— 那是本人改密才要的）。 */
export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  password: passwordField,
});

/** 管理员改目标用户的资料（姓名 / 简介）。 */
export const adminUpdateProfileSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1, "请输入用户名").max(50, "用户名最多 50 个字符"),
  bio: z.string().max(200, "简介最多 200 个字符"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type EmailOnlyValues = z.infer<typeof emailOnlySchema>;
type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export { type UpdateProfileValues, type ChangePasswordValues };
export type UserIdValues = z.infer<typeof userIdSchema>;
export type AdminSetRoleValues = z.infer<typeof adminSetRoleSchema>;
export type AdminResetPasswordValues = z.infer<typeof adminResetPasswordSchema>;
export type AdminUpdateProfileValues = z.infer<typeof adminUpdateProfileSchema>;

// ============================================================
// 通知（admin 发送；用户侧操作）
// ============================================================

/**
 * 站内链接。
 *
 * 必须是站内路径（以 / 开头）—— 允许 http(s) 会变成钓鱼入口：
 * 管理员账号一旦被盗，攻击者能给全体师生发一条跳转到仿冒登录页的通知。
 * 同时拒绝 //evil.com（协议相对 URL 也会跳出站外）。
 */
const internalLinkField = z
  .string()
  .trim()
  .max(500, "链接最多 500 个字符")
  .refine((v) => v === "" || (/^\//.test(v) && !/^\/\//.test(v)), {
    message: "链接必须是站内路径（以 / 开头）",
  });

/**
 * 通知标题/正文的长度上限。
 *
 * 定义在这里（而不是 lib/notifications）是因为三处都要用它们：
 *   1. 本文件的 schema 校验（服务端也走它）；
 *   2. 发送表单的 maxLength（客户端）—— 客户端只能 import client-safe 模块，
 *      而 lib/notifications 会拉进 db 等 server-only 依赖，不能引。
 *
 * 之前三个地方各写一个字面量（100 / 1000），改一处漏两处就会出现
 * 前端放行、服务端拒绝。
 */
export const NOTIFICATION_TITLE_MAX = 100;
export const NOTIFICATION_BODY_MAX = 1000;

export const sendNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "请输入标题")
    .max(NOTIFICATION_TITLE_MAX, `标题最多 ${NOTIFICATION_TITLE_MAX} 个字符`),
  body: z
    .string()
    .trim()
    .min(1, "请输入内容")
    .max(NOTIFICATION_BODY_MAX, `内容最多 ${NOTIFICATION_BODY_MAX} 个字符`),
  link: internalLinkField.optional(),
  /** 发给全部师生。与 roles/userIds 互斥（前端会禁用，这里也兜一道）。 */
  all: z.boolean().optional(),
  roles: z.array(z.enum(["student", "teacher"])).optional(),
  userIds: z.array(z.string().min(1)).optional(),
});

export const notificationRecipientIdSchema = z.object({
  recipientId: z.string().min(1),
});

export const notificationBatchIdSchema = z.object({
  notificationId: z.string().min(1),
});

export type SendNotificationValues = z.infer<typeof sendNotificationSchema>;

/** 通知偏好（只读自己的，身份取自会话）。 */
export const notificationPrefsSchema = z.object({
  notifyOnNewMessage: z.boolean(),
});
