import { createColumnHelper } from "@tanstack/react-table";
import { UserRowActions } from "./user-row-actions";
import { adminTableFeatures } from "./table-features";
import type { User } from "#lib/auth/current-user";

/**
 * 管理员列表的列定义。
 *
 * 两页（教师 / 学生）共用列，只有标题与数据不同 —— 所以抽在这里。
 * 必须用与表格相同的 features（见 table-features.ts），否则列类型对不上。
 */
const h = createColumnHelper<typeof adminTableFeatures, User>();

/** 邮箱验证状态的中文与配色。 */
function verifyState(u: User) {
  return u.emailVerifiedAt
    ? { text: "已验证", cls: "bg-green-100 text-green-700" }
    : { text: "未验证", cls: "bg-amber-100 text-amber-700" };
}

export const userColumns = h.columns([
  h.accessor("name", {
    header: "姓名",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),

  h.accessor("email", {
    header: "邮箱",
    cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
  }),

  h.accessor("emailVerifiedAt", {
    header: "验证状态",
    // v9 里叫 sortFn（v8 是 sortingFn）。按有无验证时间排，而不是排字符串
    sortFn: (a, b) => Number(!!a.original.emailVerifiedAt) - Number(!!b.original.emailVerifiedAt),
    cell: (info) => {
      const s = verifyState(info.row.original);
      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
      );
    },
  }),

  h.accessor("createdAt", {
    header: "注册时间",
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString("zh-CN")}
      </span>
    ),
  }),

  h.display({
    id: "actions",
    header: "",
    cell: (info) => <UserRowActions user={info.row.original} />,
  }),
]);
