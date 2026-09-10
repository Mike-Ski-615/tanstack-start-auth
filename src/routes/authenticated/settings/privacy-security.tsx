import { HugeiconsIcon } from "@hugeicons/react";
import {
  Shield01Icon,
  Logout01Icon,
  DeviceAccessIcon,
  CheckCircle,
  Circle,
  Key01Icon,
  Time01Icon,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#components/ui/alert-dialog";
import { listSessionsFn, revokeAllSessionsFn } from "#server/sessions.functions";
import { LoadingPage } from "#components/status/authenticated/settings/privacy-security/loading";
import { ErrorPage } from "#components/status/authenticated/settings/privacy-security/error";
import { NotFoundPage } from "#components/status/authenticated/settings/privacy-security/not-found";

export const Route = createFileRoute("/authenticated/settings/privacy-security")({
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

interface Session {
  id: string;
  sessionVersion: number;
  createdAt: string;
  expiresAt: string;
}

function SettingsPrivacySecurityPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.securityInfo,
    queryFn: () => listSessionsFn(),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => revokeAllSessionsFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.securityInfo });
      // 撤销全部 → 当前会话也失效 → 跳转首页
      router.navigate({ to: "/" });
    },
    onError: () => toast.error("操作失败，请重试"),
  });

  const device: Device | null = data?.device ?? null;
  const session: Session | null = data?.session ?? null;
  const emailVerifiedAt: string | null = data?.emailVerifiedAt ?? null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Shield01Icon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">隐私与安全</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看账户安全状态、已登录设备和会话信息。
        </p>
      </header>

      {/* 邮箱验证状态 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={CheckCircle} className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">邮箱验证</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <HugeiconsIcon
              icon={emailVerifiedAt ? CheckCircle : Circle}
              className={`size-5 ${emailVerifiedAt ? "text-green-500" : "text-amber-500"}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{emailVerifiedAt ? "已验证" : "未验证"}</span>
                {emailVerifiedAt && (
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    安全
                  </span>
                )}
              </div>
              {emailVerifiedAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  验证于 {new Date(emailVerifiedAt).toLocaleString("zh-CN")}
                </p>
              )}
              {!emailVerifiedAt && (
                <p className="mt-0.5 text-xs text-amber-600">
                  请检查邮箱完成验证，未验证账户可能受限
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 当前设备 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={DeviceAccessIcon} className="size-5 text-muted-foreground" />
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
                  <span className="truncate text-sm font-medium">{device.name}</span>
                  <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    当前
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {device.platform} · {device.ip} · 登录于{" "}
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

      {/* 当前会话 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={Key01Icon} className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">当前会话</h2>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : !session ? (
          <p className="p-4 text-sm text-muted-foreground">暂无活跃会话</p>
        ) : (
          <div className="divide-y">
            <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <span className="text-xs text-muted-foreground">会话 ID</span>
              <span className="truncate font-mono text-xs">{session.id}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <span className="text-xs text-muted-foreground">版本号</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">v{session.sessionVersion}</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  密码修改后递增
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <span className="text-xs text-muted-foreground">
                <HugeiconsIcon
                  icon={Calendar01Icon}
                  className="mr-1 inline size-3.5 align-[-2px]"
                />
                创建时间
              </span>
              <span className="text-sm">{new Date(session.createdAt).toLocaleString("zh-CN")}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <span className="text-xs text-muted-foreground">
                <HugeiconsIcon icon={Time01Icon} className="mr-1 inline size-3.5 align-[-2px]" />
                过期时间
              </span>
              <span className="text-sm">{new Date(session.expiresAt).toLocaleString("zh-CN")}</span>
            </div>
          </div>
        )}
      </section>

      {/* 撤销全部会话 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon icon={Logout01Icon} className="size-5 text-muted-foreground" />
          <h2 className="font-semibold">撤销全部会话</h2>
        </div>
        <div className="p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            撤销后所有设备都将需要重新登录。此操作会递增会话版本号，使所有旧会话立即失效。
          </p>
          {/*
            危险操作加确认：点一下就会把所有设备踢下线，且不可撤销。

            文案遵循两条：确认按钮重复后果（「撤销全部会话」而非「确定」），
            这样不看正文也能回答；按钮文字带动词（「取消」而非「否」）。

            确认按钮用 destructive 变体，与页面上的触发按钮保持一致 ——
            用户在弹窗里看到的仍然是同一个危险色。
          */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={revokeAllMutation.isPending}>
                {revokeAllMutation.isPending ? "处理中..." : "撤销全部会话"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>撤销全部会话？</AlertDialogTitle>
                <AlertDialogDescription>
                  所有设备都将需要重新登录，包括当前这台。此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel type="button">取消</AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  variant="destructive"
                  onClick={() => revokeAllMutation.mutate()}
                >
                  撤销全部会话
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
