import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>

      <Skeleton className="h-8 w-full" />

      <Skeleton className="mx-auto h-4 w-44" />
    </div>
  );
}
