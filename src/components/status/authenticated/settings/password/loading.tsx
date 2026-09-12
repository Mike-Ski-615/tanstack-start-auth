import { Skeleton } from "#components/ui/skeleton";
import { FieldGroup } from "#components/ui/field";

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
          <Skeleton className="h-4 w-1/2" />
        </div>
      </header>

      <FieldGroup>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-8 w-full" />
        </div>
      </FieldGroup>

      <div className="flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
