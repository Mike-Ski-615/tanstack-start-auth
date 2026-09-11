import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { columns } from "#components/admin/columns";
import { DataTable } from "#components/admin/data-table";
import { verificationStates } from "#components/admin/data";
import { adminUsersQueryOptions } from "#lib/queries/admin";
import { LoadingPage } from "#components/status/authenticated/admin/students/loading";
import { ErrorPage } from "#components/status/authenticated/admin/students/error";
import { NotFoundPage } from "#components/status/authenticated/admin/students/not-found";

export const Route = createFileRoute("/authenticated/admin/students")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: AdminStudentsPage,
  // SSR 预取：不等客户端 useQuery，管理页首屏就有数据。
  beforeLoad: async ({ context }) => {
    await context.queryClient.query({ ...adminUsersQueryOptions("student"), staleTime: "static" });
  },
});

/** 学生管理。结构与 Tasks 示例的 page.tsx 一致：标题 + 描述 + 表格。 */
function AdminStudentsPage() {
  const {
    data: students = [],
    isPending,
    error,
    refetch,
  } = useQuery(adminUsersQueryOptions("student"));

  /*
   * 三态分开写（react-query 的约定）：以前只解构 `data: students = []`，
   * 查询进行中与失败时 students 都是空数组 —— 页面照常渲染「共 0 位」+「没有
   * 结果。」，与「真的没有学生」完全无法区分，管理员可能据此以为账号下没学生。
   *
   * 注意这跟路由的 errorComponent 是两回事：那个只接 **loader** 的错误，
   * 组件内 useQuery 失败不会触发它。
   *
   * 错误文案直接展示 error.message —— 服务端抛的就是用户可读句子
   * （见 lib/error-messages.ts）。
   */
  if (isPending) return <LoadingPage />;
  if (error) return <ErrorPage reset={() => void refetch()} />;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">学生管理</h2>
        <p className="text-muted-foreground">这里是你账号下的全部学生，共 {students.length} 位。</p>
      </div>

      <DataTable
        data={students}
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
