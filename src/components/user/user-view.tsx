import Heatmap from "#components/user/heatmap";
import ThisWeek from "#components/user/week";
import { Separator } from "#components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar";
import type { UserProfile } from "#server/user.functions";
import { daysSince } from "#lib/format";
import { CONTENT_WIDTH_CLASS } from "#provider/content-width-provider";

export function UserView({ user, calendar, stats }: UserProfile) {
  // 宽度跟随 header 里的设置 —— 具体值由 CSS 从 <html data-content-width> 算，
  // 所以这里不再读 context（首屏水合前也就能是对的了）。
  return (
    <main className="min-h-full min-w-0">
      <div
        className={`flex min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8 ${CONTENT_WIDTH_CLASS}`}
      >
        <header className=" flex min-w-0 items-center gap-4 rounded-2xl bg-card p-5 lg:flex-col lg:gap-3 lg:bg-transparent lg:py-4">
          <div className="relative shrink-0">
            {/*
             * 用 Avatar 而非裸 <img>：用户没设头像时 image 是空串，
             * 裸 img 会把 alt 文字（「XX 的头像」）当正文显示出来。
             * AvatarFallback 在这种情况下显示姓名首字，与侧边栏一致。
             */}
            <Avatar className="size-16 lg:size-24">
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="text-xl lg:text-2xl">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          <div className=" min-w-0 lg:flex lg:flex-col lg:items-center">
            <h1 className=" truncate text-xl font-semibold tracking-tight lg:text-2xl">
              {user.name}
            </h1>

            <p className=" mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
        </header>

        <dl className=" grid w-full grid-cols-3 items-center gap-x-2 gap-y-4 rounded-2xl bg-card px-4 py-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] lg:gap-x-0 lg:py-4">
          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {daysSince(user.createdAt)}天
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">加入天数</dt>
          </div>

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <Stat value={stats.loginCount} label="登录次数" />

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <Stat value={stats.activeDays} label="活跃天数" />

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <Stat value={stats.currentStreak} label="连续活跃" />

          <Separator orientation="vertical" className="hidden h-8 lg:block" />

          <div className="flex flex-col items-center justify-center gap-1">
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {formatLastLogin(stats.lastLoginAt)}
            </dd>
            <dt className="text-center text-xs font-medium text-muted-foreground">最近登录</dt>
          </div>
        </dl>

        {/*
         * 分栏断点按内容定，不按设备预设。
         *
         * 实测：原来用 lg:（1024px）分栏时，热力图那栏只剩 408px —— 恰恰
         * 是它最需要宽度的时候；而 900–1000px 单栏时也只有 596–696px。
         * 热力图现在自带自适应（按容器宽度决定显示多少周），所以这里
         * 不需要为它预留固定宽度，用 xl: 在真正宽裕时再分栏即可。
         */}
        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 overflow-hidden rounded-2xl bg-card p-4 sm:p-5">
            <Heatmap data={calendar} />
          </div>
          <ThisWeek data={calendar} />
        </section>
      </div>
    </main>
  );
}

/** 统计区的一格。 */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <dd className="text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
      <dt className="text-center text-xs font-medium text-muted-foreground">{label}</dt>
    </div>
  );
}

/**
 * 最近登录的显示形态。
 *
 * 这里用**本地时区**而非 UTC：统计口径（活跃天数/连续）必须 UTC 一致以防
 * 水合不匹配，但「最近登录」给人看的是「多久以前」，用相对时间反而没有
 * 时区歧义，且不受 SSR/客户端分界影响。
 */
function formatLastLogin(iso: string | null): string {
  if (!iso) return "从未";

  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}
