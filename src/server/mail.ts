/**
 * 邮件深模块：小 interface sendMail(to, subject, text)。
 *
 * 当前实现：控制台输出（开发与生产同行为，见 grill-with-docs 决策）。
 * 将来 SMTP 参数确定后，第二个实现出现时再谈 seam——
 * 届时换实现不改 interface，用例代码一行不动。
 */
export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  console.log(
    [
      "┌────────── [mail] ──────────",
      `│ To: ${to}`,
      `│ Subject: ${subject}`,
      "│",
      ...text.split("\n").map((line) => `│ ${line}`),
      "└────────────────────────────",
    ].join("\n"),
  );
}
