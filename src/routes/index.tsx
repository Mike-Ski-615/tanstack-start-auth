import { Button } from "#components/ui/button";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

/**
 * 首页（中性落地页）：标题 + 一句说明 + 主 CTA 去登录/注册。
 * 占位已清理，待产品落地时在此填充真实内容结构。
 */
function Home() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        欢迎来到 TanStack 认证示例
      </h1>
      <p className="max-w-md text-center text-muted-foreground">
        登录后可进入仪表盘。这是一个基于 TanStack Start、React Router
        与无状态会话的标准认证起点。
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/auth/login">登录</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/auth/register">注册</Link>
        </Button>
      </div>
    </main>
  );
}
