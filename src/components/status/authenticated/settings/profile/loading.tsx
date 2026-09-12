import { Skeleton } from "#components/ui/skeleton";

export function LoadingPage() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6">
      <header>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </header>

      <form className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-32" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-full" />
          </div>

          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-8 w-24" />
        </div>
      </form>
    </div>
  );
}
