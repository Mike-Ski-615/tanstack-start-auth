import { useState, type ReactNode } from "react";
import { Button } from "#components/ui/button";
import {
  Award,
  BookMarked,
  Compass,
  Keyboard,
  Library,
  LogOut,
  PanelsLeftRight,
  Search,
  UserCircle,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
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

type CommandSection = {
  id: string;
  title: string;
  icon: ReactNode;
};

const HELP_SECTIONS: CommandSection[] = [
  { id: "account", title: "账号与登录", icon: <UserRound /> },
  { id: "roles", title: "学生与教师角色", icon: <UsersRound /> },
  { id: "sidebar", title: "侧边栏操作", icon: <PanelsLeftRight /> },
  { id: "shortcuts", title: "键盘快捷键", icon: <Keyboard /> },
  { id: "account-menu", title: "账户菜单", icon: <UserCircle /> },
  { id: "logout", title: "退出登录", icon: <LogOut /> },
];

const NAV_ITEMS: CommandSection[] = [
  { id: "resources", title: "资源", icon: <Library /> },
  { id: "lessons", title: "课例", icon: <BookMarked /> },
  { id: "collaboration", title: "小组合作", icon: <Users /> },
  { id: "exhibition", title: "展评", icon: <Award /> },
  { id: "extension", title: "拓展", icon: <Compass /> },
];

export function CommandPalette({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useHotkeys(
    "ctrl+k",
    () => setOpen((open) => !open),
    { enableOnFormTags: true, preventDefault: true },
  );

  return (
    <>
      <Button
        variant="secondary"
        className={cn(
          `bg-sidebar text-foreground justify-start sm:w-40 lg:w-56 xl:w-72 w-32`,
          className,
        )}
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden xl:inline-flex">搜索文档...</span>
        <span className="inline-flex xl:hidden">搜索...</span>
        <KbdGroup className="ml-auto hidden xl:flex">
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
                  {item.icon}
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="导航">
              {NAV_ITEMS.map((item) => (
                <CommandItem key={item.id}>
                  {item.icon}
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
