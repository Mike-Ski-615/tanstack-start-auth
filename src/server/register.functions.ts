import { createServerFn } from "@tanstack/react-start";

import { registerSchema } from "#schemas/auth";

import { enroll } from "./auth/use-cases";

export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data }) => {
    const result = await enroll(data.name, data.email, data.password);

    if (!result.ok) {
      throw new Error("Unable to create account");
    }

    return {
      ok: true,
      user: result.user,
    };
  });
