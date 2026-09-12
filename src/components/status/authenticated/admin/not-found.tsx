import { Link } from "@tanstack/react-router";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function NotFoundPage() {
  return (
    <div
      className={`flex flex-1 flex-col items-start gap-3 p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">管理页不存在</h1>
      <p className="text-sm text-muted-foreground">没找到这个管理页面，可能地址拼错了。</p>
      <Link
        to="/authenticated/admin/teachers"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回教师管理
      </Link>
    </div>
  );
}
