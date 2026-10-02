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

export type SignInEmailVariables = {
  otpCode: string;
  userEmail: string;
  appName: string;
  expirationMinutes: string;
};

export async function sendSignInEmail(to: string, variables: SignInEmailVariables): Promise<void> {
  const info = await transporter.sendMail({
    from: process.env["EMAIL_FROM"]!,
    to,
    subject: "登录验证码",
    text: [
      "你的登录验证码是：",
      "",
      `    ${variables.otpCode}`,
      "",
      `${variables.expirationMinutes} 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
    ].join("\n"),
  });

  console.log(`[mail] 已发送 messageId=${info.messageId}`);
}
