import {
  BookOpen01Icon,
  Calculator01Icon,
  ComputerIcon,
  FlashIcon,
  LanguageSkillIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type LOGO = {
  title: string;
  description: string;
  icon: IconSvgElement;
  to?: string;
};

export const LOGOS: LOGO[] = [
  {
    title: "数学",
    description: "探索数字与逻辑的奥秘",
    icon: Calculator01Icon,
    to: "/authenticated/math",
  },
  {
    title: "英语",
    description: "打开通往世界的语言之门",
    icon: LanguageSkillIcon,
    to: "/authenticated/english",
  },
  {
    title: "语文",
    description: "品味文字之美，感受文化魅力",
    icon: BookOpen01Icon,
    to: "/authenticated/chinese",
  },
  {
    title: "信息技术",
    description: "探索计算机与数字世界",
    icon: ComputerIcon,
    to: "/authenticated/information",
  },
  {
    title: "科学",
    description: "探索自然，发现世界的规律",
    icon: FlashIcon,
    to: "/authenticated/science",
  },
];
