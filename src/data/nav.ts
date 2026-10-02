import { Home01Icon, Key01Icon, UserCircleIcon, UserIcon } from "@hugeicons/core-free-icons";

import type { IconSvgElement } from "@hugeicons/react";

export type NavItem = {
  id: string;
  title: string;
  desc: string;
  icon: IconSvgElement;
  to: string;
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
    desc: "账户信息与验证状态",
    icon: UserCircleIcon,
    to: "/authenticated/settings/account",
  },
  {
    id: "profile",
    title: "个人信息",
    desc: "编辑头像与用户名",
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
];

export const INTRO: Intro[] = [
  {
    title: "账户",
    icon: UserCircleIcon,
    to: "/authenticated/settings/account",
    desc: "查看账户基本信息与验证状态。",
  },
  {
    title: "个人信息",
    icon: UserIcon,
    to: "/authenticated/settings/profile",
    desc: "编辑头像与用户名。",
  },
  {
    title: "修改密码",
    icon: Key01Icon,
    to: "/authenticated/settings/password",
    desc: "更新登录密码，需验证当前密码。",
  },
];
