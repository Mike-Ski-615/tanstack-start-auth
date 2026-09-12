import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">教师管理页不存在</h1>
      <p className="text-sm text-muted-foreground">
        没找到教师管理页面。管理区可能暂时不可用，可以先回到工作台。
      </p>
      <Link
        to="/authenticated"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </div>
  );
}
