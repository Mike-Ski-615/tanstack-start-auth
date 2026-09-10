import { createColumnHelper } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "#components/ui/badge";
import { Checkbox } from "#components/ui/checkbox";

import { roles, verificationStates } from "./data";
import { type User } from "#lib/auth/current-user";
import { DataTableColumnHeader } from "./data-table-column-header";
import { type UsersTableFeatures } from "./data-table-features";
import { DataTableRowActions } from "./data-table-row-actions";

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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="选择此行"
        className="translate-y-[2px]"
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
          <span className="max-w-[500px] truncate font-medium">{row.getValue("name")}</span>
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
        <div className="flex w-[100px] items-center gap-2">
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
        <div className="flex w-[100px] items-center gap-2">
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
