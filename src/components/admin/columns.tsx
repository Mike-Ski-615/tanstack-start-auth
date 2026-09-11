import { createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "#components/ui/badge";
import { Checkbox } from "#components/ui/checkbox";

import { roles, verificationStates } from "#components/admin/data";
import { type User } from "#lib/auth/current-user";
import { DataTableColumnHeader } from "#components/admin/data-table-column-header";
import { type UsersTableFeatures } from "#components/admin/data-table-features";
import { DataTableRowActions } from "#components/admin/data-table-row-actions";

// Use `accessor` for data columns and `display` for columns without one.
const columnHelper = createColumnHelper<UsersTableFeatures, User>();

export const columns = columnHelper.columns([
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="全选"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="选择此行"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }),

  columnHelper.accessor("name", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="姓名" />,
    cell: ({ row }) => {
      const role = roles.find((r) => r.value === row.original.role);

      return (
        <div className="flex gap-2">
          {role && <Badge variant="outline">{role.label}</Badge>}
          {/* 点人名 → 该用户的主页 */}
          <Link
            to="/authenticated/users/$userId"
            params={{ userId: row.original.id }}
            className="max-w-125 truncate font-medium hover:underline hover:underline-offset-2"
          >
            {row.getValue("name")}
          </Link>
        </div>
      );
    },
  }),

  columnHelper.accessor("email", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="邮箱" />,
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  }),

  columnHelper.accessor("role", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="角色" />,
    cell: ({ row }) => {
      const role = roles.find((r) => r.value === row.getValue("role"));

      if (!role) return null;

      return (
        <div className="flex min-w-25 items-center gap-2">
          {role.icon && <HugeiconsIcon icon={role.icon} className="size-4 text-muted-foreground" />}
          <span>{role.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return (value as string[]).includes(row.getValue(id));
    },
  }),

  columnHelper.accessor("emailVerifiedAt", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="验证状态" />,
    cell: ({ row }) => {
      const state = verificationStates.find(
        (s) => s.value === (row.original.emailVerifiedAt ? "verified" : "unverified"),
      );

      if (!state) return null;

      return (
        <div className="flex min-w-25 items-center gap-2">
          {state.icon && (
            <HugeiconsIcon icon={state.icon} className="size-4 text-muted-foreground" />
          )}
          <span>{state.label}</span>
        </div>
      );
    },
    // faceted filter 传进来的是 ["verified"] / ["unverified"]，
    // 而这一列的值是时间戳或 null —— 所以要自己比。
    filterFn: (row, id, value) => {
      const want = value as string[];
      const actual = row.getValue(id) ? "verified" : "unverified";
      return want.includes(actual);
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
    cell: ({ row }) => <DataTableRowActions row={row} />,
  }),
]);
