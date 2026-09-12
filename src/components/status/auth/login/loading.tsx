import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded-sm" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />

      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  );
}
