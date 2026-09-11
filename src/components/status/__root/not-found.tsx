import { Link } from "@tanstack/react-router";

/**
 * 整站未找到（__root）。
 *
 * 挂在整站根上，是所有「没有更具体 404 页」的兜底。无外壳，整屏居中。
 *
 * 退路只给首页：这里拿不到用户角色（不在 authenticated 的 context 内），
 * 无法按角色给工作台；首页是唯一无条件可达的落点。
 */
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <h1 className="text-2xl font-semibold text-foreground">页面未找到</h1>
      <p className="text-muted-foreground">你访问的地址不存在或已被移动。</p>
      <Link to="/" className="text-sm font-medium underline underline-offset-4 hover:no-underline">
        回到首页
      </Link>
    </main>
  );
}
