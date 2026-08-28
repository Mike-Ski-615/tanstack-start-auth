import { createServerFn } from "@tanstack/react-start";

import {
  emailOnlySchema,
  resetPasswordSchema,
  verifyTokenSchema,
} from "#schemas/auth";

import {
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "./auth/verification";

export const verifyEmailFn = createServerFn({
  method: "POST",
})
  .validator(verifyTokenSchema)
  .handler(async ({ data }) => {
    return verifyEmail(data.token);
  });

export const resendVerificationFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data }) => {
    return resendVerification(data.email);
  });

export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data }) => {
    return requestPasswordReset(data.email);
  });

export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data }) => {
    return resetPassword(data.token, data.password);
  });
