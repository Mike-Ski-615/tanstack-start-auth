import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "#components/ui/button";

/**
 * 教师管理错误（/authenticated/admin/teachers）。
 *
 * 这是管理区的**默认落点**（`/authenticated/admin` 会 redirect 到这里），
 * 所以它的错误页比别的更关键 —— 管理员很可能一进管理区就撞上它。
 *
 * 挂载在 admin 布局的 `<Outlet />` 内，外层已有 padding，不重复。
 * 退路不能是 teachers 自己（那就是当前页，点了原地打转），给回工作台。
 *
 * 两种用法共用这一个组件：路由级 errorComponent（loader 失败），以及页面内
 * 组件级 —— teachers.tsx 里 useQuery 失败时就地渲染。后者没有路由的 error
 * 对象，所以只取 reset。
 */
export function ErrorPage({ reset }: Pick<ErrorComponentProps, "reset">) {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">教师列表加载失败</h1>
      <p className="text-sm text-muted-foreground">
        没能取到教师数据。可以重试，或先回到你的工作台。
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          重试
        </Button>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </div>
  );
}
