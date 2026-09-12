import { Skeleton } from "#components/ui/skeleton";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function LoadingPage() {
  return (
    <div className={`flex h-full min-h-0 flex-col gap-6 p-4 lg:flex-row ${SIDEBAR_GUTTER_CLASS}`}>
      <nav className="flex shrink-0 flex-col gap-1 lg:w-56">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Skeleton className="h-7 w-40" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="h-5 w-32" />

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-10/12" />
        </div>

        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
