import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Calendar01Icon,
  CheckCircle,
  Circle,
  Shield01Icon,
  DeviceAccessIcon,
  Mail01Icon,
  IdIcon,
} from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "#lib/query-keys";
import { listSessionsFn } from "#server/sessions.functions";
import { LoadingPage } from "#components/status/authenticated/settings/account/loading";
import { ErrorPage } from "#components/status/authenticated/settings/account/error";
import { NotFoundPage } from "#components/status/authenticated/settings/account/not-found";

export const Route = createFileRoute("/authenticated/settings/account")({
  pendingComponent: LoadingPage,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  component: SettingsAccountPage,
});

const ROLE_LABELS: Record<string, string> = {
  student: "学生",
  teacher: "教师",
};

function SettingsAccountPage() {
  const { user } = Route.useRouteContext();

  const { data } = useQuery({
    queryKey: queryKeys.securityInfo,
    queryFn: () => listSessionsFn(),
  });

  const emailVerifiedAt: string | null = data?.emailVerifiedAt ?? null;
  const hasDevice = !!data?.device;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={UserIcon}
            className="size-5 text-muted-foreground"
          />
          <h1 className="text-xl font-semibold">账户</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          查看账户基本信息、验证状态和登录状态。
        </p>
      </header>

      {/* 基本信息 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            icon={IdIcon}
            className="size-5 text-muted-foreground"
          />
          <h2 className="font-semibold">基本信息</h2>
        </div>
        <div className="divide-y">
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">用户 ID</span>
            <span className="truncate font-mono text-xs">{user.id}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Mail01Icon}
                className="mr-1 inline size-3.5 align-[-2px]"
              />
              邮箱
            </span>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">
              <HugeiconsIcon
                icon={Calendar01Icon}
                className="mr-1 inline size-3.5 align-[-2px]"
              />
              注册时间
            </span>
            <span className="text-sm">
              {new Date(user.createdAt).toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">角色</span>
            <span className="text-sm">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        </div>
      </section>

      {/* 验证状态 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            icon={CheckCircle}
            className="size-5 text-muted-foreground"
          />
          <h2 className="font-semibold">验证状态</h2>
        </div>
        <div className="divide-y">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={emailVerifiedAt ? CheckCircle : Circle}
                className={`size-5 shrink-0 ${emailVerifiedAt ? "text-green-500" : "text-amber-500"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {emailVerifiedAt ? "邮箱已验证" : "邮箱未验证"}
                  </span>
                  {emailVerifiedAt && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      安全
                    </span>
                  )}
                </div>
                {emailVerifiedAt ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    验证于 {new Date(emailVerifiedAt).toLocaleString("zh-CN")}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-amber-600">
                    请检查邮箱完成验证，未验证账户可能受限
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 登录状态 */}
      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <HugeiconsIcon
            icon={DeviceAccessIcon}
            className="size-5 text-muted-foreground"
          />
          <h2 className="font-semibold">登录状态</h2>
        </div>
        <div className="divide-y">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={Shield01Icon}
                className="size-5 shrink-0 text-blue-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">单设备登录</span>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    已启用
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  同一时刻只能有一个设备在线，新登录会自动踢出旧设备
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">设备状态</span>
            <span className="text-sm">
              {hasDevice ? "已绑定设备" : "暂无设备"}
            </span>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-1 p-4">
            <span className="text-xs text-muted-foreground">会话版本</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">v{user.sessionVersion}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                密码修改后递增
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
