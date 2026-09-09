import { Skeleton } from "#components/ui/skeleton";

/** 加载中：与状态页同布局的骨架屏，路由切换时不跳动。 */
export function LoadingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-5 w-64 max-w-md" />
      <Skeleton className="h-5 w-16" />
    </main>
  );
}
