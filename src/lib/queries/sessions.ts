import { queryOptions } from "@tanstack/react-query";
import { listSessionsFn } from "#server/sessions.functions";

export const securityInfoQueryOptions = queryOptions({
  queryKey: ["security-info"] as const,
  queryFn: () => listSessionsFn(),
});
