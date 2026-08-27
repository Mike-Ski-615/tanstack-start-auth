import { createServerFn } from "@tanstack/react-start";

import { getCurrentUser } from "./auth/current-user";

export const getCurrentUserFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await getCurrentUser();

  return result?.user ?? null;
});
