/**
 * 通用邮件发送（当前演示实现：控制台输出，见 grill-with-docs 决策）。
 * 将来接 SMTP 时只改这里，interface 与调用方不变。
 */
export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  // 等宽下 CJK 字符占两列，框右缘不强行对齐文字列；仅用顶/中/底线分区。
  console.log(
    [
      "┌─ [password reset] ────────────",
      `│ 收件人 ${to}`,
      `│ 主题   ${subject}`,
      "├─ 正文 ───────────────────────",
      ...text.split("\n").map((line) => `│ ${line}`),
      "└───────────────────────────────",
    ].join("\n"),
  );
}
