import { createFileRoute } from "@tanstack/react-router";
import { LoadingPage } from "#components/status/authenticated/settings/privacy-security/loading";
import { ErrorPage } from "#components/status/authenticated/settings/privacy-security/error";
import { NotFoundPage } from "#components/status/authenticated/settings/privacy-security/not-found";
import { Skeleton } from "#components/ui/skeleton";
import { Shield } from "lucide-react";

export const Route = createFileRoute(
  "/authenticated/settings/privacy-security",
)({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsPrivacySecurityPage,
});

/** 隐私与安全：页面骨架占位，功能开发中。 */
function SettingsPrivacySecurityPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">隐私与安全</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看账号安全概览与隐私设置。
        </p>
      </header>

      {/* 概览统计块：四格 */}
      <div aria-hidden>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4"
            >
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>

        {/* 安全项开关列表 */}
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-5 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
