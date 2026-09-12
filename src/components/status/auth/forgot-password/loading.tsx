import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-8 w-full" />
      </div>

      <Skeleton className="h-8 w-full" />

      <Skeleton className="mx-auto h-4 w-36" />
    </div>
  );
}
