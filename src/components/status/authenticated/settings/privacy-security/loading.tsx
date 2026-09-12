import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </header>

      <div className="rounded-xl border">
        <div className="flex items-center gap-2 border-b p-4">
          <Skeleton className="size-4.5 shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-1.5 h-3.5 w-56 max-w-full" />
                </div>
                <Skeleton className="h-8 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
