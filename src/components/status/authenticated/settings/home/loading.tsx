import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-4.5 shrink-0" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="mt-3 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
