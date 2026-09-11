/**
 * 测试用模块替身。
 *
 * 两件事：
 * 1. getRequestIP —— 生产代码用无参形式读 socket 地址，mockEvent 造不出
 *    真实 socket，实测恒为 undefined。限速用例需要按 IP 隔离，改读
 *    withRequest 注入的上下文。
 * 2. sendMail —— 当前实现是 console.log，测试要从邮件正文里取 OTP。
 *    在这里截获，避免每个用例去正则解析 stdout。
 */
import { vi } from "vitest";
import { currentRequestIP } from "./request";

export interface CapturedMail {
  to: string;
  subject: string;
  text: string;
}

/** 已捕获的邮件，测试里断言用。 */
export const mails: CapturedMail[] = [];

export function clearMails(): void {
  mails.length = 0;
}

vi.mock("@tanstack/react-start/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start/server")>();
  return {
    ...actual,
    getRequestIP: () => currentRequestIP(),
  };
});

vi.mock("#lib/auth/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#lib/auth/mail")>();
  return {
    ...actual,
    sendMail: async (to: string, subject: string, text: string) => {
      mails.push({ to, subject, text });
    },
  };
});
