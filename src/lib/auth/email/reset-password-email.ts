import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env["SMTP_HOST"]!,
  port: Number(process.env["SMTP_PORT"]),
  secure: process.env["SMTP_SECURE"] === "true",
  auth: {
    user: process.env["SMTP_USER"]!,
    pass: process.env["SMTP_PASS"]!,
  },
});

export type ResetPasswordEmailVariables = {
  otpCode: string;
  userEmail: string;
  appName: string;
  expirationMinutes: string;
};

export async function sendResetPasswordEmail(
  to: string,
  variables: ResetPasswordEmailVariables,
): Promise<void> {
  const info = await transporter.sendMail({
    from: process.env["EMAIL_FROM"]!,
    to,
    subject: "重置你的密码",
    text: [
      "你的密码重置验证码是：",
      "",
      `    ${variables.otpCode}`,
      "",
      `${variables.expirationMinutes} 分钟内有效。如果你没有发起此请求，可以安全地忽略这封邮件。`,
    ].join("\n"),
  });

  console.log(`[mail] 已发送 messageId=${info.messageId}`);
}
