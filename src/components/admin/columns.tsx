import { createColumnHelper } from "@tanstack/react-table";

import { DataTableColumnHeader } from "./data-table-column-header";
import { UserRowActions } from "./user-row-actions";
import { type DataTableFeatures } from "./data-table-features";
import type { User } from "#lib/auth/current-user";

/**
 * 管理员列表的列定义（学生页与教师页共用）。
 *
 * 照 shadcn Data Table 指南的写法：
 * - createColumnHelper<DataTableFeatures, User>()
 * - accessor 用于数据列，display 用于无数据的列（操作列）
 * - 表头用 <DataTableColumnHeader />（可排序）
 */
const columnHelper = createColumnHelper<DataTableFeatures, User>();

export const userColumns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="姓名" />,
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  }),

  columnHelper.accessor("email", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="邮箱" />,
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("email")}</span>,
  }),

  columnHelper.accessor("emailVerifiedAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="验证状态" />,
    // 按有无验证时间排，而不是排字符串
    sortFn: (a, b) => Number(!!a.original.emailVerifiedAt) - Number(!!b.original.emailVerifiedAt),
    cell: ({ row }) => {
      const s = verifyState(row.original);
      return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
      );
    },
  }),

  columnHelper.accessor("createdAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="注册时间" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.getValue("createdAt")).toLocaleDateString("zh-CN")}
      </span>
    ),
  }),

  columnHelper.display({
    id: "actions",
    // 操作列不可排序（无数据可排），也允许用户隐藏
    enableSorting: false,
    cell: ({ row }) => <UserRowActions user={row.original} />,
  }),
]);

/** 邮箱验证状态的中文与配色。 */
function verifyState(u: User) {
  return u.emailVerifiedAt
    ? { text: "已验证", cls: "bg-green-100 text-green-700" }
    : { text: "未验证", cls: "bg-amber-100 text-amber-700" };
}
