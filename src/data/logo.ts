import {
  BookOpen,
  Calculator,
  FlaskConical,
  Languages,
  Monitor,
  type LucideIcon,
} from "lucide-react";

export type LOGO = {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
};

export const LOGOS: LOGO[] = [
  {
    title: "数学",
    description: "探索数字与逻辑的奥秘",
    icon: Calculator,
    to: "/authenticated/math",
  },
  {
    title: "英语",
    description: "打开通往世界的语言之门",
    icon: Languages,
    to: "/authenticated/english",
  },
  {
    title: "语文",
    description: "品味文字之美，感受文化魅力",
    icon: BookOpen,
    to: "/authenticated/chinese",
  },
  {
    title: "信息技术",
    description: "探索计算机与数字世界",
    icon: Monitor,
    to: "/authenticated/information",
  },
  {
    title: "科学",
    description: "探索自然，发现世界的规律",
    icon: FlaskConical,
    to: "/authenticated/science",
  },
];
