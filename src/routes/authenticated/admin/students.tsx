import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { listUsersByRoleFn } from "#server/admin.functions";
import { queryKeys } from "#lib/query-keys";
import { DataTable } from "#components/admin/data-table";
import { userColumns } from "#components/admin/columns";
import { LoadingPage } from "#components/status/authenticated/loading";
import { ErrorPage } from "#components/status/authenticated/error";
import { NotFoundPage } from "#components/status/authenticated/not-found";

const adminUsersQueryOptions = (role: "student" | "teacher") => ({
  queryKey: queryKeys.adminUsersList(role),
  queryFn: () => listUsersByRoleFn({ data: { role } }),
});

export const Route = createFileRoute("/authenticated/admin/students")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminStudentsPage,
  // SSR 预取：不等客户端 useQuery。管理页首屏就该有数据，
  // 否则服务端渲染出来是空表（pendingComponent 接管）。
  beforeLoad: async ({ context }) => {
    await context.queryClient.ensureQueryData(adminUsersQueryOptions("student"));
  },
});

/** 学生管理：列出全部学生，操作同教师页。 */
function AdminStudentsPage() {
  const { data: students = [] } = useQuery(adminUsersQueryOptions("student"));

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={UserIcon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">学生管理</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {students.length} 位学生。可编辑资料、调整角色、踢下线、重置密码或删除账号。
        </p>
      </header>

      <DataTable
        data={students}
        columns={userColumns}
        filterPlaceholder="筛选学生邮箱…"
        emptyText="还没有学生账号"
        columnTitles={{
          name: "姓名",
          email: "邮箱",
          emailVerifiedAt: "验证状态",
          createdAt: "注册时间",
          actions: "操作",
        }}
      />
    </div>
  );
}
