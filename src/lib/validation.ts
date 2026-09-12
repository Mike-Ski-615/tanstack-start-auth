import * as v from "valibot";

export function issuesToFields(issues: readonly v.BaseIssue<unknown>[]): {
  fields: Record<string, { message: string }>;
} {
  const fields: Record<string, { message: string }> = {};
  for (const issue of issues) {
    const path = v.getDotPath(issue);
    if (path) fields[path] = { message: issue.message };
  }
  return { fields };
}
