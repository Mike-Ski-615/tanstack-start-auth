import {
  Award,
  Bell,
  BookMarked,
  Compass,
  Home,
  Keyboard,
  KeyRound,
  Library,
  LogOut,
  PanelsLeftRight,
  Shield,
  User,
  UserCircle,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  title: string;
  icon: LucideIcon;
  to?: string;
};

type Intro = {
  title: string;
  desc: string;
  icon: LucideIcon;
  to: string;
};

export const SETTINGS_NAV: NavItem[] = [
  { id: "home", title: "主页", icon: Home, to: "/authenticated/settings/home" },
  {
    id: "profile",
    title: "个人信息",
    icon: User,
    to: "/authenticated/settings/profile",
  },
  {
    id: "profile",
    title: "修改密码",
    icon: KeyRound,
    to: "/authenticated/settings/password",
  },
  { id: "bell", title: "通知", icon: Bell, to: "/authenticated/settings/bell" },
  {
    id: "privacy-security",
    title: "隐私与安全",
    icon: Shield,
    to: "/authenticated/settings/privacy-security",
  },
];

export const NAV_ITEMS: NavItem[] = [
  { id: "resources", title: "资源", icon: Library, to: "/authenticated" },
  { id: "lessons", title: "课例", icon: BookMarked, to: "/authenticated" },
  { id: "collaboration", title: "小组合作", icon: Users, to: "/authenticated" },
  { id: "exhibition", title: "展评", icon: Award, to: "/authenticated" },
  { id: "extension", title: "拓展", icon: Compass, to: "/authenticated" },
];

export const HELP_SECTIONS: NavItem[] = [
  { id: "account", title: "账号与登录", icon: UserRound },
  { id: "roles", title: "学生与教师角色", icon: UsersRound },
  { id: "sidebar", title: "侧边栏操作", icon: PanelsLeftRight },
  { id: "shortcuts", title: "键盘快捷键", icon: Keyboard },
  { id: "account-menu", title: "账户菜单", icon: UserCircle },
  { id: "logout", title: "退出登录", icon: LogOut },
];

export const INTRO: Intro[] = [
  {
    title: "个人信息",
    icon: User,
    to: "/authenticated/settings/profile",
    desc: "编辑头像、用户名与个人介绍。",
  },
  {
    title: "修改密码",
    icon: KeyRound,
    to: "/authenticated/settings/password",
    desc: "更新登录密码，需验证当前密码。",
  },
  {
    title: "通知",
    icon: Bell,
    to: "/authenticated/settings/bell",
    desc: "管理站内消息与各类提醒偏好。",
  },
  {
    title: "隐私与安全",
    icon: Shield,
    to: "/authenticated/settings/privacy-security",
    desc: "查看账号安全概览与隐私设置。",
  },
];
