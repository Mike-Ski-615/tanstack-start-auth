import { HugeiconsIcon } from "@hugeicons/react";
import { MoonIcon, Sun01Icon } from "@hugeicons/core-free-icons";
import { Button } from "#components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#components/ui/tooltip";
import { useTheme } from "#provider/theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "浅色" : "深色";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <HugeiconsIcon
            icon={Sun01Icon}
            className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
          />
          <HugeiconsIcon
            icon={MoonIcon}
            className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
          />
          <span className="sr-only">切换主题</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>切到{next}主题</TooltipContent>
    </Tooltip>
  );
}
