import { CommandPalette } from "#components/header/command-palette";
import { HeaderBreadcrumb } from "#components/header/header-breadcrumb";
import { ModeToggle } from "#components/header/mode-toggle";
import { ContentWidthToggle } from "#components/header/content-width-toggle";
import { PanelLeftOpen } from "#components/header/panel-left-open";
import { Separator } from "#components/ui/separator";
import { useSidebar } from "#components/ui/sidebar";
import { cn } from "#lib/utils";
import { HeaderBell } from "#components/header/header-bell";
import type { Role } from "#lib/auth/current-user";

export function Header({ role }: { role: Role }) {
  // ps-4 是给**桌面侧栏**让出的头部左边距；lg 以下侧栏是 Sheet 浮层，
  // 不占位，所以只在该断点以上生效（与 PanelLeftOpen 的口径一致）。
  const { open } = useSidebar();

  /*
    响应式策略：先让「位置提示」让位，再收「次要偏好」，最后才是主操作退化。

    宽度顺序（从宽到窄）：
      xl  搜索文档... + Ctrl+K 键位提示 | 面包屑两段 | 宽度切换 | 主题
      lg  搜索文档...（无键位提示）     | 面包屑两段 | 宽度切换 | 主题
      sm  搜索...                        | 仅当前页   | 宽度切换 | 主题
      <sm 仅放大镜图标                   | （无）     | （无）   | 主题

    分隔线跟着隔壁控件走：控件隐藏了，分隔线会变成悬空竖线，所以同生共死。
  */
  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-2 border-b p-2", open && "lg:ps-4")}>
      <PanelLeftOpen />
      <Separator
        className={cn(open && "lg:hidden", "my-auto data-[orientation=vertical]:h-4")}
        orientation="vertical"
      />

      {/* 面包屑：窄屏整体收起（它只是位置提示，不是可操作目标）。
          md 以下连首段「帮助」也收掉，只留当前页。 */}
      <HeaderBreadcrumb />

      <CommandPalette className="ml-auto" role={role} />

      {/* 搜索与通知之间。两者都是常驻控件，所以这条分隔线也常驻。 */}
      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />

      <HeaderBell />

      {/* 内容宽度切换：sm 以下隐藏 —— 窄屏本来就没多少宽度可调，
          把位置留给能操作的图标。 */}
      <Separator
        className="my-auto hidden data-[orientation=vertical]:h-4 sm:block"
        orientation="vertical"
      />
      <ContentWidthToggle className="hidden sm:inline-flex" />

      <Separator className="my-auto data-[orientation=vertical]:h-4" orientation="vertical" />
      <ModeToggle />
    </header>
  );
}
