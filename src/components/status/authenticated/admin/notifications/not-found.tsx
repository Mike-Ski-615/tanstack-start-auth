import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">通知页不存在</h1>
      <p className="text-sm text-muted-foreground">
        没找到发送通知页面，地址可能有误。它在管理区，与教师管理并列。
      </p>
      <Link
        to="/authenticated/admin/teachers"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回教师管理
      </Link>
    </div>
  );
}
