import { Skeleton } from "#components/ui/skeleton";
import { CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";

export function LoadingPage() {
  return (
    <main className="min-h-full min-w-0">
      <div
        className={`flex min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8 ${CONTENT_WIDTH_CLASS}`}
      >
        <header className="flex min-w-0 items-center gap-4 rounded-2xl bg-card p-5 lg:flex-col lg:gap-3 lg:bg-transparent lg:py-4">
          <Skeleton className="size-16 shrink-0 rounded-full lg:size-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-2 lg:items-center">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-2 h-7 w-20" />
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
      </div>
    </main>
  );
}
