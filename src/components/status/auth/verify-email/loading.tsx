import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      <div className="flex items-center justify-center gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="size-9 rounded-md" />
        ))}
      </div>

      <Skeleton className="h-8 w-full" />

      <Skeleton className="mx-auto h-4 w-40" />
    </div>
  );
}
