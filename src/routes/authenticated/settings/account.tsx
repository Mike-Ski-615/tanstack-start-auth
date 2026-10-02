import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Calendar01Icon,
  CheckCircle,
  Circle,
  Mail01Icon,
  IdIcon,
} from "@hugeicons/core-free-icons";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/settings/account/loading";
import { ErrorPage } from "#components/status/authenticated/settings/account/error";
import { NotFoundPage } from "#components/status/authenticated/settings/account/not-found";

export const Route = createFileRoute("/authenticated/settings/account")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsAccountPage,
});

function SettingsAccountPage() {
  const { session } = getRouteApi("/authenticated").useRouteContext();
  const user = session.user;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={UserIcon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">账户</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">查看账户基本信息与验证状态。</p>
      </header>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={IdIcon} className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">基本信息</h2>
        </div>
        <div className="divide-y">
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">用户 ID</span>
            <span className="truncate font-mono text-xs">{user.id}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">
              <HugeiconsIcon icon={Mail01Icon} className="mr-1 inline size-3.5 align-[-2px]" />
              邮箱
            </span>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">
              <HugeiconsIcon icon={Calendar01Icon} className="mr-1 inline size-3.5 align-[-2px]" />
              注册时间
            </span>
            <span className="text-sm">{new Date(user.createdAt).toLocaleString("zh-CN")}</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={CheckCircle} className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">验证状态</h2>
        </div>
        <div className="divide-y">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={user.emailVerified ? CheckCircle : Circle}
                className={`size-5 shrink-0 ${user.emailVerified ? "text-green-500" : "text-amber-500"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {user.emailVerified ? "邮箱已验证" : "邮箱未验证"}
                  </span>
                  {user.emailVerified && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      安全
                    </span>
                  )}
                </div>
                {!user.emailVerified && (
                  <p className="mt-0.5 text-xs text-amber-600">
                    请检查邮箱完成验证，未验证账户无法登录
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
