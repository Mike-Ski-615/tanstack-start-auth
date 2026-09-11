import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "#components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/ui/command";
import { cn } from "#lib/utils";
import { Kbd, KbdGroup } from "#components/ui/kbd";
import { useHotkeys } from "react-hotkeys-hook";
import { useIsBelow } from "#hooks/use-mobile";
import { HELP_SECTIONS, navItemsFor, SETTINGS_NAV } from "#data/nav";
import type { Role } from "#lib/auth/current-user";

export function CommandPalette({ className, role }: { className?: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = navItemsFor(role);

  // sm 以下按钮只剩图标（没有文字可读）—— variant 据此从 secondary 换成 ghost。
  const isCompact = useIsBelow("sm");

  useHotkeys("ctrl+k", () => setOpen((open) => !open), {
    enableOnFormTags: true,
    preventDefault: true,
  });

  return (
    <>
      {/*
        三档退化：
          窄（<sm） -> 只剩放大镜图标，variant 转 ghost；
          中（>=sm）-> 「搜索...」，variant 回 secondary；
          宽（>=lg）-> 「搜索文档...」；
          最宽（>=xl）-> 再加上 Ctrl+K 键位提示。

        搜索是 header 的主操作，任何宽度下都不能消失 —— 最窄时收成图标
        而不是隐藏。

        图标档的切换文字用 CSS（sm:/lg:），但 variant 是单个 prop、无法用
        类切，只能用 JS —— 所以这里用 useIsBelow("sm") 拿同一个断点。

        aria-label 必须保留，且要含可见文字：
        - 窄屏（<sm）两个 span 都是 display:none，没有 aria-label 时这里就变成
          一个无名按钮（axe 的 button-name 报 critical）—— 比下面那条严重得多。
        - 之前写的是 "搜索"，不含屏幕上看到的「搜索文档...」，触发 WCAG 2.5.3
          （可见标签必须包含在无障碍名里）。现在改成「搜索文档」。

        KbdGroup 用 aria-hidden 排除：它只是快捷键提示，不该进无障碍名
        （屏幕阅读器念「Ctrl + K」对听用户没有意义）。

        注：axe 的 label-content-name-mismatch 在本按钮上仍会报 serious，
        但那是它的已知局限，不是本组件的真问题：只要按钮里存在**第二个**
        文本片段（这里就是 Ctrl + K），它就判定不匹配，与 aria-label 写什么
        无关。用静态 fixture 在真实 Chrome 里穷举过（axe-core 4.13.0）：

            单 span「搜索文档...」 + aria-label="搜索文档"             -> PASS
            再加一个 Ctrl 片段，aria-label 逐个试过 4 种写法        -> 均 FAIL
            把 Ctrl 片段标成 aria-hidden 或包进一个 aria-hidden 容器  -> 仍 FAIL

        根因是 axe 用 subtreeText 而非 visibleVirtual，未剔除隐藏/装饰文本。
        真要让这条也过，只能把快捷键提示搬到按钮外（布局会变），不值。
      */}
      <Button
        type="button"
        variant={isCompact ? "ghost" : "secondary"}
        aria-label="搜索文档"
        className={cn("justify-start px-2", !isCompact && "px-2.5", className)}
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={Search01Icon} />
        <span className="hidden truncate sm:inline lg:hidden">搜索...</span>
        <span className="hidden truncate lg:inline">搜索文档...</span>
        <KbdGroup aria-hidden="true" className="ml-auto hidden shrink-0 xl:flex">
          <Kbd>Ctrl</Kbd>
          <span>+</span>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="帮助文档"
        description="搜索或浏览帮助主题。"
      >
        <Command>
          <CommandInput placeholder="搜索帮助内容…" />
          <CommandList>
            <CommandEmpty>无匹配结果</CommandEmpty>
            <CommandGroup heading="帮助主题">
              {HELP_SECTIONS.map((item) => (
                <CommandItem key={item.id}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="导航">
              {navItems.map((item) => (
                <CommandItem key={item.id}>
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="设置">
              {SETTINGS_NAV.map((item) => (
                <CommandItem
                  key={item.to}
                  onSelect={() => {
                    navigate({ to: item.to });
                    setOpen(false);
                  }}
                >
                  <HugeiconsIcon icon={item.icon} />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
