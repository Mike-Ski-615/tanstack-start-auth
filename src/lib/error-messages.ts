export const ERROR_MESSAGE = {
  FORBIDDEN: "权限不足，请重新登录",

  UNAUTHENTICATED: "登录状态已失效，请重新登录",

  NOT_FOUND: "该用户不存在或不可管理",

  CANNOT_TARGET_SELF: "不能对自己执行此操作",

  RATE_LIMITED: "操作过于频繁，请稍后再试",

  EMAIL_TAKEN: "这个邮箱已被注册",

  INVALID_CREDENTIALS: "邮箱或密码不正确",

  OTP_INVALID: "验证码不正确",

  OTP_EXPIRED: "验证码已过期，请重新获取",

  OTP_TOO_MANY_ATTEMPTS: "尝试次数过多，请重新获取验证码",

  WRONG_PASSWORD: "当前密码不正确",

  NO_RECIPIENTS: "没有匹配的收件人，请检查发送目标",

  TOO_MANY_RECIPIENTS: "收件人过多，请分批发",

  UNKNOWN: "操作失败，请稍后重试",
} as const;

export const OTP_REASON_MESSAGE = {
  invalid: ERROR_MESSAGE.OTP_INVALID,
  expired: ERROR_MESSAGE.OTP_EXPIRED,
  too_many_attempts: ERROR_MESSAGE.OTP_TOO_MANY_ATTEMPTS,
} as const;
