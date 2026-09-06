import { Button } from "#components/ui/button";
import React from "react";
import {
  Award,
  BookMarked,
  Compass,
  Keyboard,
  Library,
  LogOut,
  PanelsLeftRight,
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

type CommandSection = {
  id: string;
  title: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: CommandSection[] = [
  { id: "resources", title: "资源", icon: <Library /> },
  { id: "lessons", title: "课例", icon: <BookMarked /> },
  { id: "collaboration", title: "小组合作", icon: <Users /> },
  { id: "exhibition", title: "展评", icon: <Award /> },
  { id: "extension", title: "拓展", icon: <Compass /> },
];

const HELP_SECTIONS: CommandSection[] = [
  {
    id: "account",
    title: "账号与登录",
    icon: <UserRound />,
  },
  { id: "roles", title: "学生与教师角色", icon: <UsersRound /> },
  {
    id: "sidebar",
    title: "侧边栏操作",
    icon: <PanelsLeftRight />,
  },
  { id: "shortcuts", title: "键盘快捷键", icon: <Keyboard /> },
  { id: "account-menu", title: "账户菜单", icon: <UserCircle /> },
  { id: "logout", title: "退出登录", icon: <LogOut /> },
];

export function Header() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Button
        variant="secondary"
        className="bg-sidebar text-foreground w-46 justify-start"
        onClick={() => setOpen(true)}
      >
        <span className="hidden xl:inline-flex">搜索文档...</span>
        <span className="inline-flex xl:hidden">搜索...</span>
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
    </header>
  );
}
