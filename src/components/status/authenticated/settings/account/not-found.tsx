import { Link } from "@tanstack/react-router";

/**
 * 账号设置未找到（/authenticated/settings/account）。
 *
 * 弹窗内，容器对齐 max-w-3xl。
 *
 * 退路给设置总览（分区列表）—— 用户想找的是某个设置分区，
 * 送到列表让他自己挑，比送出去再重进弹窗少两步。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">账号设置不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到账号设置分区。设置总览里列出了所有可用分区。
      </p>
      <Link
        to="/authenticated/settings/home"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        设置总览
      </Link>
    </div>
  );
}
