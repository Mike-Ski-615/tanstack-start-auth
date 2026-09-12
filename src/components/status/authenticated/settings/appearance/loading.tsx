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
          <Skeleton className="h-4 w-2/3" />
        </div>
      </header>

      <div className="rounded-xl border">
        <div className="flex items-center gap-2 border-b p-4">
          <Skeleton className="size-4.5 shrink-0" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="divide-y">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] gap-1 p-4">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-40 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
