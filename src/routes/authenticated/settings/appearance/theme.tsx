import { createFileRoute } from "@tanstack/react-router";

import { Moon02Icon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { Switch } from "#components/ui/switch";
import { useTheme } from "#provider/theme-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/theme")({
  component: ThemeSetting,
});

function ThemeSetting() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingPage title="主题" desc="亮色或暗色外观，跟随 ctrl+j 快捷键" icon={Moon02Icon}>
      <SettingRow label="深色模式" desc="亮色或暗色外观，跟随 ctrl+j 快捷键">
        <Switch
          checked={theme === "dark"}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          aria-label="深色模式"
        />
      </SettingRow>

      <PreviewBox>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border bg-background px-3 py-2 text-sm">背景</div>
          <div className="rounded-lg border bg-card px-3 py-2 text-sm">卡片</div>
          <div className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
            弱化
          </div>
          <div className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
            主要
          </div>
          <div className="rounded-lg border border-destructive px-3 py-2 text-sm text-destructive">
            危险
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
