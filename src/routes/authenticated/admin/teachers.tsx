import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { columns } from "#components/admin/columns";
import { DataTable } from "#components/admin/data-table";
import { verificationStates } from "#components/admin/data";
import { listUsersByRoleFn } from "#server/admin.functions";
import { queryKeys } from "#lib/query-keys";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";

const adminUsersQueryOptions = (role: "teacher" | "teacher") => ({
  queryKey: queryKeys.adminUsersList(role),
  queryFn: () => listUsersByRoleFn({ data: { role } }),
});

export const Route = createFileRoute("/authenticated/admin/teachers")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminTeachersPage,
  // SSR 预取：不等客户端 useQuery，管理页首屏就有数据。
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(adminUsersQueryOptions("teacher"));
  },
});

/** 教师管理。结构与 Tasks 示例的 page.tsx 一致：标题 + 描述 + 表格。 */
function AdminTeachersPage() {
  const { data: teachers = [] } = useQuery(adminUsersQueryOptions("teacher"));

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">教师管理</h2>
        <p className="text-muted-foreground">这里是你账号下的全部教师，共 {teachers.length} 位。</p>
      </div>

      <DataTable
        data={teachers}
        columns={columns}
        searchColumn="name"
        searchPlaceholder="筛选姓名…"
        verifiedOptions={verificationStates.map((s) => ({
          label: s.label,
          value: s.value,
        }))}
      />
    </div>
  );
}
