import {
  Award01Icon,
  BookBookmark01Icon,
  CompassIcon,
  Home01Icon,
  Key01Icon,
  KeyboardIcon,
  LibraryIcon,
  Logout01Icon,
  Notification01Icon,
  SidebarLeft01Icon,
  Shield01Icon,
  UserCircleIcon,
  UserIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import type { IconSvgElement } from "@hugeicons/react";

export type NavItem = {
  id: string;
  title: string;
  desc: string;
  icon: IconSvgElement;
  to?: string;
};

type Intro = {
  title: string;
  desc: string;
  icon: IconSvgElement;
  to: string;
};

export const SETTINGS_NAV: NavItem[] = [
  {
    id: "home",
    title: "主页",
    desc: "设置入口概览",
    icon: Home01Icon,
    to: "/authenticated/settings/home",
  },
  {
    id: "account",
    title: "账户",
    desc: "账户信息、验证与登录状态",
    icon: UserCircleIcon,
    to: "/authenticated/settings/account",
  },
  {
    id: "profile",
    title: "个人信息",
    desc: "编辑头像、用户名与个人介绍",
    icon: UserIcon,
    to: "/authenticated/settings/profile",
  },
  {
    id: "password",
    title: "修改密码",
    desc: "更新登录密码，需验证当前密码",
    icon: Key01Icon,
    to: "/authenticated/settings/password",
  },
  {
    id: "bell",
    title: "通知",
    desc: "管理站内消息与各类提醒偏好",
    icon: Notification01Icon,
    to: "/authenticated/settings/bell",
  },
  {
    id: "privacy-security",
    title: "隐私与安全",
    desc: "设备管理、会话详情与撤销",
    icon: Shield01Icon,
    to: "/authenticated/settings/privacy-security",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    id: "resources",
    title: "资源",
    desc: "",
    icon: LibraryIcon,
    to: "/authenticated",
  },
  {
    id: "lessons",
    title: "课例",
    desc: "",
    icon: BookBookmark01Icon,
    to: "/authenticated",
  },
  {
    id: "collaboration",
    title: "小组合作",
    desc: "",
    icon: UserGroupIcon,
    to: "/authenticated",
  },
  {
    id: "exhibition",
    title: "展评",
    desc: "",
    icon: Award01Icon,
    to: "/authenticated",
  },
  {
    id: "extension",
    title: "拓展",
    desc: "",
    icon: CompassIcon,
    to: "/authenticated",
  },
];

export const HELP_SECTIONS: NavItem[] = [
  {
    id: "account",
    title: "账号与登录",
    desc: "",
    icon: UserIcon,
  },
  {
    id: "roles",
    title: "学生与教师角色",
    desc: "",
    icon: UserGroupIcon,
  },
  {
    id: "sidebar",
    title: "侧边栏操作",
    desc: "",
    icon: SidebarLeft01Icon,
  },
  {
    id: "shortcuts",
    title: "键盘快捷键",
    desc: "",
    icon: KeyboardIcon,
  },
  {
    id: "account-menu",
    title: "账户菜单",
    desc: "",
    icon: UserCircleIcon,
  },
  {
    id: "logout",
    title: "退出登录",
    desc: "",
    icon: Logout01Icon,
  },
];

export const INTRO: Intro[] = [
  {
    title: "账户",
    icon: UserCircleIcon,
    to: "/authenticated/settings/account",
    desc: "查看账户基本信息、验证状态和登录状态。",
  },
  {
    title: "个人信息",
    icon: UserIcon,
    to: "/authenticated/settings/profile",
    desc: "编辑头像、用户名与个人介绍。",
  },
  {
    title: "修改密码",
    icon: Key01Icon,
    to: "/authenticated/settings/password",
    desc: "更新登录密码，需验证当前密码。",
  },
  {
    title: "通知",
    icon: Notification01Icon,
    to: "/authenticated/settings/bell",
    desc: "管理站内消息与各类提醒偏好。",
  },
  {
    title: "隐私与安全",
    icon: Shield01Icon,
    to: "/authenticated/settings/privacy-security",
    desc: "查看设备与会话详情，撤销全部会话。",
  },
];
