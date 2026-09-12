import * as v from "valibot";

/**
 * 把 valibot 的 issues 映射成 TanStack Form 的字段错误形状。
 *
 * 自定义 validator 直接返回 issue 数组（或任何没有 `fields` 属性的错误对象）会被
 * TanStack Form 当成**表单级**错误 —— 它只从带 `fields` 的返回值里取字段错误，
 * 于是字段上的 <FieldError errors={field.state.meta.errors} /> 什么也不显示。
 * 返回 { fields: { [字段名]: { message } } } 才能落到具体字段。
 */
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
