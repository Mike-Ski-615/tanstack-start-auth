/**
 * 密码重置邮件：发送逻辑与内容（主题/正文）都收口在本函数，用例只传收件人和含令牌的链接。
 *
 * 当前实现：控制台输出（开发与生产同行为，见 grill-with-docs 决策）。
 * 将来 SMTP 参数确定后，只改这里的输出实现，interface 与用例不动。
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
