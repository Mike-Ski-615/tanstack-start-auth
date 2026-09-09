import { HugeiconsIcon } from "@hugeicons/react";
import { SlidersHorizontalIcon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ErrorPage } from "#components/status/authenticated/settings/home/error";
import { LoadingPage } from "#components/status/authenticated/settings/home/loading";
import { NotFoundPage } from "#components/status/authenticated/settings/home/not-found";
import { INTRO } from "#data/nav";

export const Route = createFileRoute("/authenticated/settings/home")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsHomePage,
});

function SettingsHomePage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={SlidersHorizontalIcon}
            className="size-5 text-muted-foreground"
          />
          <h1 className="text-xl font-semibold">设置</h1>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          在这里管理你的个人资料、登录密码、账号与安全和通知偏好。右侧或顶栏可随时在各设置页间切换。
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTRO.map(({ title, desc, icon, to }) => (
          <Link
            key={title}
            to={to}
            className="group rounded-xl border bg-card p-4 transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex items-center gap-2.5 font-medium">
              <HugeiconsIcon
                icon={icon}
                className="size-4.5 text-muted-foreground"
              />
              {title}
            </div>

            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        需要帮助？了解账号登录、各角色权限与快捷键，可前往
        <Link
          to="/authenticated/help"
          className="mx-1 text-primary underline underline-offset-4"
        >
          帮助文档
        </Link>
        。
      </p>
    </div>
  );
}
