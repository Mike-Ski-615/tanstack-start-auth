import { Link } from "@tanstack/react-router";

/**
 * 设置首页未找到（/authenticated/settings/home）。
 *
 * 弹窗内，容器宽度对齐该页的 max-w-3xl；内容区已有 p-5（不重复 padding）。
 *
 * 退路给 `/authenticated/settings`（设置总览）而非工作台：用户本意是
 * 进设置，把他留在设置弹窗内比踢出去更贴心 —— 而 settings 根会给出
 * 全部分区的入口。
 */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">设置总览不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到设置总览页面。可以从这里前往各个设置分区。
      </p>
      <Link
        to="/authenticated/settings/home"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        打开设置总览
      </Link>
    </div>
  );
}
