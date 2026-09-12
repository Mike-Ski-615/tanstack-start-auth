import { Skeleton } from "#components/ui/skeleton";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function LoadingPage() {
  return (
    <div className={`p-4 sm:p-5 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-64 max-w-full" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>

          <div className="overflow-hidden rounded-md border">
            <div className="border-b p-3">
              <Skeleton className="h-4 w-full" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b p-3 last:border-b-0">
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
