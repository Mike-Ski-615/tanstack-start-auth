import { createServerFn } from "@tanstack/react-start";

import { getCurrentUser } from "./auth/session";

export const getCurrentUserFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const result = await getCurrentUser();

  if (!result) {
    return null;
  }

  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    image: result.user.image,
    bio: result.user.bio,
  };
});
