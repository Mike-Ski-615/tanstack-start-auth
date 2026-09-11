import { Link } from "@tanstack/react-router";

/**
 * 隐私与安全未找到（/authenticated/settings/privacy-security）。
 *
 * 弹窗内，容器对齐 max-w-3xl。
 *
 * 退路给设置总览。用户来这页多半是想看登录设备或改安全设置，
 * 送达分区列表后他能立刻换到目标分区。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">隐私与安全页不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到隐私与安全分区。设置总览里列出了所有可用分区。
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
