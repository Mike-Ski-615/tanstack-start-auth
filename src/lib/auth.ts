import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { emailOTP } from "better-auth/plugins";
import { i18n, locales } from "@better-auth/i18n";

import { prisma } from "#prisma/db";
import { sendRegisterEmail } from "#lib/auth/email/register-email";
import { sendSignInEmail } from "#lib/auth/email/sign-in-email";
import { sendResetPasswordEmail } from "#lib/auth/email/reset-password-email";

const APP_NAME = "TanStack Start Auth";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  advanced: {
    database: {
      generateId: "uuid",
      joins: true,
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  rateLimit: {
    enabled: true,
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 900,
      allowedAttempts: 5,
      storeOTP: "hashed",
      resendStrategy: "rotate",
      overrideDefaultEmailVerification: true,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "forget-password") {
          return sendResetPasswordEmail(email, {
            otpCode: otp,
            userEmail: email,
            appName: APP_NAME,
            expirationMinutes: "15",
          });
        }

        if (type === "sign-in") {
          return sendSignInEmail(email, {
            otpCode: otp,
            userEmail: email,
            appName: APP_NAME,
            expirationMinutes: "15",
          });
        }

        if (type === "email-verification") {
          return sendRegisterEmail(email, {
            otpCode: otp,
            userEmail: email,
            appName: APP_NAME,
            expirationMinutes: "15",
          });
        }
      },
    }),
    i18n({
      translations: {
        zh: {
          ...locales.zh,
          INVALID_OTP: "验证码不正确",
          OTP_EXPIRED: "验证码已过期，请重新获取",
          TOO_MANY_ATTEMPTS: "尝试次数过多，请重新获取验证码",
        },
      },
      defaultLocale: "zh",
      detection: ["header", "cookie"],
    }),
    tanstackStartCookies(),
  ],
});
