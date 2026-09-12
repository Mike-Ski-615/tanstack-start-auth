import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <Skeleton className="h-8 w-72 max-w-full" />
      <div className="flex w-full max-w-md flex-col items-center gap-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </main>
  );
}
