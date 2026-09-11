import { Skeleton } from "#components/ui/skeleton";

/**
 * 教师工作台加载态（/authenticated/teacher）。
 *
 * 挂载点在 `SidebarInset` 内，不用 min-h-svh；边距对齐 `teacher.tsx` 的 p-4。
 *
 * 这一份与学生工作台那份**内容几乎一样，但故意分开写** ——
 * 两个页面将来会各自长出不同结构（教师要看班级/学生数，学生看自己的课），
 * 骨架各自独立才能跟着各自的页面走，而不是被强行绑在一起。
 */
export function LoadingPage() {
  return (
    <section className="p-4 lg:ps-7">
      <Skeleton className="h-8 w-16" />
      <div className="mt-2 flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </section>
  );
}
