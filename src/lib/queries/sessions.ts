import { queryOptions } from "@tanstack/react-query";
import { listSessionsFn } from "#server/sessions.functions";

/** 会话 / 设备信息（账号页与隐私安全页共用）。 */
export const securityInfoQueryOptions = queryOptions({
  queryKey: ["security-info"] as const,
  queryFn: () => listSessionsFn(),
});
