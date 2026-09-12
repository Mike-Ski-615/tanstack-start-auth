import { Link } from "@tanstack/react-router";

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
