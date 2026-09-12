import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-56 max-w-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
