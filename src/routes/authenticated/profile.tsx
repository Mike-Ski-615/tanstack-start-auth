import Heatmap from "#components/profile/heatmap";
import ThisWeek from "#components/profile/week";
import { Separator } from "#components/ui/separator";
import { createFileRoute } from "@tanstack/react-router";
import { daysSince, formatPresence } from "#lib/format";

export const Route = createFileRoute("/authenticated/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();

  return (
    <main className="min-h-full min-w-0">
      <div className=" mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8">
        <header className=" flex min-w-0 items-center gap-4 rounded-2xl bg-card p-5 lg:flex-col lg:gap-3 lg:bg-transparent lg:py-4">
          <div className="relative shrink-0">
            <img
              src={user.image ?? ""}
              alt={`${user.name ?? "用户"} 的头像`}
              className=" size-16 rounded-full object-cover lg:size-24"
            />
            <span
              title={user.status === "online" ? "在线" : "离线"}
              className={`absolute right-1 bottom-1 size-3.5 rounded-full ring-2 ring-card lg:size-4 ${
                user.status === "online" ? "bg-emerald-500" : "bg-destructive"
              }`}
            />
          </div>

          <div className=" min-w-0 lg:flex lg:flex-col lg:items-center">
            <h1 className=" truncate text-xl font-semibold tracking-tight lg:text-2xl">
              {user.name}
            </h1>

            <p className=" mt-1 truncate text-sm text-muted-foreground">
              {user.email}
            </p>

            <p
              className="mt-0.5 text-xs text-muted-foreground"
              title={`上线 ${user.connectedAt ? new Date(user.connectedAt).toLocaleString() : "—"} · 下线 ${user.disconnectedAt ? new Date(user.disconnectedAt).toLocaleString() : "—"}`}
            >
              {formatPresence(user)}
            </p>
          </div>
        </header>

        <dl className=" grid w-full grid-cols-3 items-center gap-x-2 gap-y-4 rounded-2xl bg-card px-4 py-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-x-0 lg:py-4">
          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {daysSince(user.createdAt)}天
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              加入天数
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              xxx
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              xxx
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              xx
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              xxxx
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              xx
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              xxx
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              xxx
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              xxxx
            </dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              xxx
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">
              xxx
            </dt>
          </div>
        </dl>

        <section className=" grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 overflow-hidden rounded-2xl bg-card p-4 sm:p-5">
            <Heatmap />
          </div>
          <ThisWeek />
        </section>
      </div>
    </main>
  );
}
