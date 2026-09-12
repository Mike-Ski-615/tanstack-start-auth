import { Link } from "@tanstack/react-router";
import { CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";

export function NotFoundPage() {
  return (
    <main className="min-h-full min-w-0">
      <div className={`flex flex-col items-start gap-3 p-4 sm:p-6 lg:p-8 ${CONTENT_WIDTH_CLASS}`}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">找不到这个用户</h1>
        <p className="text-sm text-muted-foreground">
          该用户不存在，或者资料已被删除。请确认链接是否正确。
        </p>
        <Link
          to="/authenticated"
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          回到工作台
        </Link>
      </div>
    </main>
  );
}
