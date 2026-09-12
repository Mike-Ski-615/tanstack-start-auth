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
  beforeLoad: async ({ context }) => {
    await context.queryClient.query({ ...adminUsersQueryOptions("teacher"), staleTime: "static" });
  },
});

function AdminTeachersPage() {
  const {
    data: teachers = [],
    isPending,
    error,
    refetch,
  } = useQuery(adminUsersQueryOptions("teacher"));

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
