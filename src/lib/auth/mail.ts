export async function sendMail(to: string, subject: string, text: string): Promise<void> {
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
