import { Skeleton } from "#components/ui/skeleton";
import { CONTENT_WIDTH_CLASS, SIDEBAR_GUTTER_CLASS } from "#provider/content-width-provider";

export function LoadingPage() {
  return (
    <section className={`p-4 ${SIDEBAR_GUTTER_CLASS} ${CONTENT_WIDTH_CLASS}`}>
      <Skeleton className="h-8 w-16" />
      <div className="mt-2 flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </section>
  );
}
