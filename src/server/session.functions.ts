import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#lib/auth";

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
  return (await auth.api.getSession({ headers: getRequestHeaders() })) ?? null;
});
