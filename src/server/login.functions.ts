import { createServerFn } from "@tanstack/react-start";

import { loginSchema } from "#schemas/auth";

import { authenticate } from "./auth/use-cases";

/** 客户端据此切换“重发验证邮件”入口（稳定宇串，勿改文案） */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";

export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const result = await authenticate(data.email, data.password);

    if (!result.ok) {
      if (result.error === "email_not_verified") {
        throw new Error(EMAIL_NOT_VERIFIED);
      }
      throw new Error("Invalid email or password");
    }

    return {
      ok: true,
    };
  });
