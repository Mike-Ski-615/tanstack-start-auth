/**
 * 服务端错误的用户可读文案。
 *
 * ## 为什么集中在这里
 *
 * 按 react-query 的约定：**服务端抛出的 `error.message` 会直接被界面展示**，
 * 所以它必须是用户能读懂的句子，而不是机器码。
 *
 *   // 服务端
 *   throw new Error(ERROR_MESSAGE.FORBIDDEN);
 *
 *   // 客户端（skill 的写法）
 *   if (error) return <ErrorMessage message={error.message} />
 *
 * 在此之前两边靠机器码 + `String.includes()` 匹配对接：
 *
 *   if (e.message.includes("forbidden")) toast.error("权限不足，请重新登录");
 *
 * 那种写法的代价：每个消费方都要知道错误码表；文案散落在客户端各处；
 * 服务端改一个码要全局搜索；`error.message` 本身不可展示（"forbidden"
 * 直接显示给用户毫无意义），于是 skill 那行 `error.message` 永远用不上。
 *
 * 现在文案是唯一真源，客户端直接展示 message，不再做字符串匹配。
 *
 * ## 一处刻意的取舍
 *
 * 文案是**静态**的（不含拼接的用户数据）。这样服务端不会因为把用户输入
 * 拼进错误信息而产生 XSS / 信息泄露面，客户端也不需要再处理转义。
 */
export const ERROR_MESSAGE = {
  /**
   * 权限不足。
   *
   * 未登录与「登录了但不是 admin」用同一句：不区分这两种情况，
   * 避免给探测者额外信息（见 admin-guard 的说明）。
   */
  FORBIDDEN: "权限不足，请重新登录",

  /** 会话已失效或未登录。 */
  UNAUTHENTICATED: "登录状态已失效，请重新登录",

  /** 目标用户不存在，或不在可管理范围内。 */
  NOT_FOUND: "该用户不存在或不可管理",

  /** 管理员对自己执行了不该执行的操作。 */
  CANNOT_TARGET_SELF: "不能对自己执行此操作",

  /** 请求过于频繁。 */
  RATE_LIMITED: "操作过于频繁，请稍后再试",

  /**
   * 邮箱已被注册。
   *
   * 已不再使用：注册接口**不能**告诉调用方邮箱是否已存在（那是个免费的
   * 账号枚举接口）。邮箱重复时服务端返回与成功一致的响应，改由邮件告知
   * 邮箱持有者本人 —— 详见 register.functions.ts。
   *
   * 留着是因为将来若做「已验证用户才能改邮箱」之类的流程，可能需要它。
   */
  EMAIL_TAKEN: "这个邮箱已被注册",

  /** 邮箱或密码不正确。 */
  INVALID_CREDENTIALS: "邮箱或密码不正确",

  /** 验证码不正确。 */
  OTP_INVALID: "验证码不正确",

  /** 验证码已过期。 */
  OTP_EXPIRED: "验证码已过期，请重新获取",

  /** 验证码尝试次数过多。 */
  OTP_TOO_MANY_ATTEMPTS: "尝试次数过多，请重新获取验证码",

  /** 当前密码不正确。 */
  WRONG_PASSWORD: "当前密码不正确",

  /** 通知收件人为空。 */
  NO_RECIPIENTS: "没有匹配的收件人，请检查发送目标",

  /** 通知收件人超过单次上限。 */
  TOO_MANY_RECIPIENTS: "收件人过多，请分批发",

  /** 兜底：未预期的失败。不暴露服务端细节。 */
  UNKNOWN: "操作失败，请稍后重试",
} as const;

/**
 * OTP 失败原因 -> 文案。
 *
 * consumeOtp 返回的是 `"invalid" | "expired" | "too_many_attempts"` 这样的
 * 内部判别值（它是纯逻辑层，不该依赖展示文案），在这里映射成句子。
 */
export const OTP_REASON_MESSAGE = {
  invalid: ERROR_MESSAGE.OTP_INVALID,
  expired: ERROR_MESSAGE.OTP_EXPIRED,
  too_many_attempts: ERROR_MESSAGE.OTP_TOO_MANY_ATTEMPTS,
} as const;
