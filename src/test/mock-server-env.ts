/**
 * 测试用模块替身。
 *
 * sendMail —— 当前实现是 console.log，测试要从邮件正文里取 OTP。
 * 在这里截获，避免每个用例去正则解析 stdout。
 *
 * 注：这里**不再**替身 getRequestIP。以前靠它换掉生产实现（mockEvent 造不出
 * 真实 socket），但那个 mock 到不了 serverFn 的编译产物（`*?tss-serverfn-split`），
 * 走服务端路径时 IP 维度会静默失效。现在由 withRequest 把 IP 写进 mock event，
 * 交给生产代码自己的 getRequestIP() 读（见 src/test/request.ts）。
 */
import { vi } from "vitest";

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

vi.mock("#lib/auth/mail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#lib/auth/mail")>();
  return {
    ...actual,
    sendMail: async (to: string, subject: string, text: string) => {
      mails.push({ to, subject, text });
    },
  };
});
