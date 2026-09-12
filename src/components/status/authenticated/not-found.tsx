import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ROLE_HOME } from "#lib/auth/current-user";
import { currentUserQueryOptions } from "#lib/queries/user";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function NotFoundPage() {
  const { data: user } = useQuery(currentUserQueryOptions);

  const fallback: string = user ? ROLE_HOME[user.role] : "/";

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-4 bg-background p-4 text-center sm:p-6 ${SIDEBAR_GUTTER_CLASS}`}
    >
      <h1 className="text-2xl font-semibold text-foreground">页面不存在</h1>
      <p className="max-w-md text-muted-foreground">这个地址不在你的账号里，或者已经被移动了。</p>
      <Link
        to={fallback}
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </div>
  );
}
