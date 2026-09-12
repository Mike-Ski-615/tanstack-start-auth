import { Skeleton } from "#components/ui/skeleton";
import { SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function LoadingPage() {
  return (
    <div
      className={`flex flex-1 items-center justify-center bg-background p-4 sm:p-6 ${SIDEBAR_GUTTER_CLASS}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
