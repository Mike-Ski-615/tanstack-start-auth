import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { columns } from "#components/admin/columns";
import { DataTable } from "#components/admin/data-table";
import { verificationStates } from "#components/admin/data";
import { adminUsersQueryOptions } from "#lib/queries/admin";
import { LoadingPage } from "#components/status/authenticated/admin/teachers/loading";
import { ErrorPage } from "#components/status/authenticated/admin/teachers/error";
import { NotFoundPage } from "#components/status/authenticated/admin/teachers/not-found";

export const Route = createFileRoute("/authenticated/admin/teachers")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminTeachersPage,
  // SSR 预取：不等客户端 useQuery，管理页首屏就有数据。
  beforeLoad: async ({ context }) => {
    await context.queryClient.query({ ...adminUsersQueryOptions("teacher"), staleTime: "static" });
  },
});

/** 教师管理。结构与 Tasks 示例的 page.tsx 一致：标题 + 描述 + 表格。 */
function AdminTeachersPage() {
  const {
    data: teachers = [],
    isPending,
    error,
    refetch,
  } = useQuery(adminUsersQueryOptions("teacher"));

  // 三态分开写，理由同 students.tsx：只解构 data 会让「查询失败」
  // 长得跟「真的没有教师」一样（都是「共 0 位」+ 空表）。
  if (isPending) return <LoadingPage />;
  if (error) return <ErrorPage reset={() => void refetch()} />;

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
