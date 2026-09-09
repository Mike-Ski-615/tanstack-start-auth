import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  Logout01Icon,
  DeviceAccessIcon,
} from "@hugeicons/core-free-icons";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { listSessionsFn, revokeSessionFn } from "#server/sessions.functions";
import { LoadingPage } from "#components/status/authenticated/settings/privacy-security/loading";
import { ErrorPage } from "#components/status/authenticated/settings/privacy-security/error";
import { NotFoundPage } from "#components/status/authenticated/settings/privacy-security/not-found";

export const Route = createFileRoute(
  "/authenticated/settings/privacy-security",
)({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsPrivacySecurityPage,
});

interface Session {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

function SettingsPrivacySecurityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: () => listSessionsFn(),
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) =>
      revokeSessionFn({ data: { sessionId } }),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      const revoked = data?.sessions.find((s) => s.id === sessionId);
      if (revoked?.isCurrent) {
        // 撤销的是当前会话 → 跳转首页（登出）
        router.navigate({ to: "/" });
      } else {
        toast.success("已撤销该设备的登录");
      }
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const sessions: Session[] = data?.sessions ?? [];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Shield01Icon}
            className="size-5 text-muted-foreground"
          />
          <h1 className="text-xl font-semibold">隐私与安全</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看已登录的设备，可随时撤销访问权限。同一时刻只能有一个设备在线。
        </p>
      </header>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            icon={DeviceAccessIcon}
            className="size-5 text-muted-foreground"
          />
          <h2 className="font-semibold">活跃会话</h2>
          <span className="ml-auto text-sm text-muted-foreground">
            {sessions.length} 个设备
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">暂无活跃会话</p>
        ) : (
          <ul className="divide-y">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {session.userAgent || "未知设备"}
                    </span>
                    {session.isCurrent && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        当前
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {session.ip || "未知 IP"} · 登录于{" "}
                    {new Date(session.createdAt).toLocaleString("zh-CN")}
                    · 过期于{" "}
                    {new Date(session.expiresAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(session.id)}
                >
                  <HugeiconsIcon icon={Logout01Icon} className="mr-1 size-4" />
                  {session.isCurrent ? "登出" : "撤销"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
