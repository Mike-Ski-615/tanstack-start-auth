import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </header>

      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-3.5 w-64 max-w-full" />
          </div>
          <Skeleton className="h-5 w-9 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}
