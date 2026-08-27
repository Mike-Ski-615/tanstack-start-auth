import { createServerFn } from "@tanstack/react-start";

import { loginSchema } from "#schemas/auth";

import { authenticate } from "./auth/use-cases";

export const login = createServerFn({
  method: "POST",
})
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const result = await authenticate(data.email, data.password);

    if (!result.ok) {
      throw new Error("Invalid email or password");
    }

    return {
      ok: true,
    };
  });
