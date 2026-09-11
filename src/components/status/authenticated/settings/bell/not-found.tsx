import { Link } from "@tanstack/react-router";

/**
 * 通知设置未找到（/authenticated/settings/bell）。
 *
 * 弹窗内，容器对齐 max-w-3xl。
 *
 * 这份文件以前并不存在 —— 该路由借用的是 `settings/` 目录下的通用状态页。
 * 按「目录与路由一一对应」的约定单独建一份，退路与文案也就能针对
 * 通知设置来写。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">通知设置不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到通知设置分区。设置总览里列出了所有可用分区。
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
