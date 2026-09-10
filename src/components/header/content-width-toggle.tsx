import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowExpandIcon,
  ArrowShrinkIcon,
  LayoutThreeColumnIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { useContentWidth, CONTENT_WIDTH_LABEL } from "#provider/content-width-provider";

/**
 * 内容区宽度切换：窄 → 宽 → 通栏，循环。
 *
 * 只在三个工作台布局（student / teacher / admin）里生效 —— 它们读同一个
 * provider 的宽度。其它页面（设置、帮助等）各有各的宽度，不受影响。
 */
export function ContentWidthToggle() {
  const { width, cycle } = useContentWidth();

  const icon =
    width === "narrow"
      ? ArrowShrinkIcon
      : width === "wide"
        ? LayoutThreeColumnIcon
        : ArrowExpandIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={cycle}
          aria-label={`内容宽度：${CONTENT_WIDTH_LABEL[width]}（点击切换）`}
        >
          <HugeiconsIcon icon={icon} className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>布局：{CONTENT_WIDTH_LABEL[width]}</TooltipContent>
    </Tooltip>
  );
}
