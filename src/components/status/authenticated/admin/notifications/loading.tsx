import { Skeleton } from "#components/ui/skeleton";
import { Card, CardContent, CardHeader } from "#components/ui/card";

export function LoadingPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>

      <div className="@container grid gap-6 @3xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-14" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-8 w-full" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-24 w-full" />
              </div>

              <div className="flex justify-end">
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="ml-auto h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
