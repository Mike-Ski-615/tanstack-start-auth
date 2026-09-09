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
import { listSessionsFn, revokeAllSessionsFn } from "#server/sessions.functions";
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

interface Device {
  id: string;
  name: string | null;
  platform: string;
  userAgent: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

function SettingsPrivacySecurityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["device"],
    queryFn: () => listSessionsFn(),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => revokeAllSessionsFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device"] });
      // 撤销全部 → 当前会话也失效 → 跳转首页
      router.navigate({ to: "/" });
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const device: Device | null = data?.device ?? null;

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
          <h2 className="font-semibold">当前设备</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : !device ? (
          <p className="p-4 text-sm text-muted-foreground">暂无已登录设备</p>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {device.name || "未知设备"}
                  </span>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    当前
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {device.platform} · {device.ip || "未知 IP"} · 登录于{" "}
                  {new Date(device.createdAt).toLocaleString("zh-CN")}
                  {device.lastSeenAt && (
                    <> · 最后活动 {new Date(device.lastSeenAt).toLocaleString("zh-CN")}</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            icon={Logout01Icon}
            className="size-5 text-muted-foreground"
          />
          <h2 className="font-semibold">撤销全部会话</h2>
        </div>
        <div className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            撤销后所有设备都将需要重新登录。
          </p>
          <Button
            variant="destructive"
            disabled={revokeAllMutation.isPending}
            onClick={() => revokeAllMutation.mutate()}
          >
            {revokeAllMutation.isPending ? "处理中..." : "撤销全部会话"}
          </Button>
        </div>
      </section>
    </div>
  );
}
