import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowExpandIcon,
  ArrowShrinkIcon,
  LayoutThreeColumnIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { cn } from "#lib/utils";
import { useContentWidth, CONTENT_WIDTH_LABEL } from "#provider/content-width-provider";

export function ContentWidthToggle({ className }: { className?: string }) {
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
          className={cn(className)}
          aria-label={`内容宽度：${CONTENT_WIDTH_LABEL[width]}（点击切换）`}
        >
          <HugeiconsIcon icon={icon} className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>布局：{CONTENT_WIDTH_LABEL[width]}</TooltipContent>
    </Tooltip>
  );
}
