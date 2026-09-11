import { Link } from "@tanstack/react-router";

/**
 * 个人资料未找到（/authenticated/settings/profile）。
 *
 * 弹窗内，容器对齐 max-w-3xl。
 *
 * 退路给设置总览：用户想改的是自己的资料，送到分区列表即可，
 * 无需离开弹窗。文案点明「个人资料」在哪个位置，便于下次直接找到。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">个人资料页不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到个人资料分区。它就在设置总览的第一个入口。
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
