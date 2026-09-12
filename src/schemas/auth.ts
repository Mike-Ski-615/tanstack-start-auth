import * as v from "valibot";
import { MANAGED_ROLES } from "#lib/auth/current-user";

const emailField = v.pipe(v.string(), v.minLength(1, "请输入邮箱"), v.email("邮箱格式不正确"));
const passwordField = v.pipe(
  v.string(),
  v.minLength(6, "密码至少 6 位"),
  v.maxLength(32, "密码最多 32 位"),
);

/** 6 位数字验证码。 */
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

/** 按 id 取任意用户的公开形态。 */
export const userIdSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
});

// ============================================================
// 管理员操作（仅 admin 可调用，校验在 server fn 里做）
// ============================================================

/** 管理员改目标用户的角色。只允许改成非 admin 值 —— 见 admin.functions.ts。
 *
 * 枚举从 MANAGED_ROLES 推导而非另写一份字面量：受管角色只有一处定义
 * （#lib/auth/current-user），加第 4 个角色时 schema 自动跟进。
 */
export const adminSetRoleSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  role: v.picklist(MANAGED_ROLES),
});

/** 管理员重置目标用户的密码（不需要旧密码 —— 那是本人改密才要的）。 */
export const adminResetPasswordSchema = v.object({
  userId: v.pipe(v.string(), v.minLength(1)),
  password: passwordField,
});

/** 管理员改目标用户的资料（姓名 / 简介）。 */
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
const internalLinkField = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(500, "链接最多 500 个字符"),
  v.check(
    (link) => link === "" || (/^\//.test(link) && !/^\/\//.test(link)),
    "链接必须是站内路径（以 / 开头）",
  ),
);

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
  /** 发给全部师生。与 roles/userIds 互斥（前端会禁用，这里也兜一道）。 */
  all: v.optional(v.boolean()),
  /** 用 MANAGED_ROLES：今天「可被管理的角色」与「可收通知的角色」恰好同一集合
   *  （见 current-user.ts 的注释）。真出现「能被管理但不能收通知」的角色时，
   *  这里要拆成一个独立的名字，而不是继续白拿受管清单。 */
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

/** 通知偏好（只读自己的，身份取自会话）。 */
export const notificationPrefsSchema = v.object({
  notifyOnNewMessage: v.boolean(),
});
