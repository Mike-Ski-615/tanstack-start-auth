import { Link } from "@tanstack/react-router";

/**
 * 设置区未找到（/authenticated/settings）。
 *
 * 弹窗内（h-[min(80vh,500px)]），内容区已有 p-5，所以不重复 padding，
 * 用 h-full 在滚动区内居中。
 *
 * 退路是关闭弹窗回工作台 —— 设置区的"上一层"就是工作台，
 * 指 `/` 会跳过一层，不符合弹窗的心智模型。
 */
export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-lg font-semibold text-foreground">设置页不存在</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        没找到这个设置分区。左侧或顶部的导航列出了所有可用的设置页。
      </p>
      <Link
        to="/authenticated"
        className="text-sm font-medium underline underline-offset-4 hover:no-underline"
      >
        回到工作台
      </Link>
    </div>
  );
}
