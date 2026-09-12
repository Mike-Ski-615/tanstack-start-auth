import { createFileRoute } from "@tanstack/react-router";

import { Moon02Icon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow, Segmented } from "#components/settings/setting-row";
import { EnumSlider } from "#components/ui/enum-slider";
import { useTheme } from "#provider/theme-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/theme")({
  component: ThemeSetting,
});

const THEMES = ["light", "dark"] as const;
const THEME_LABEL = { light: "亮色", dark: "暗色" } as const;

function ThemeSetting() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingPage title="主题" desc="亮色或暗色外观，跟随 ctrl+j 快捷键" icon={Moon02Icon}>
      <SettingRow label="模式" desc="亮色或暗色外观，跟随 ctrl+j 快捷键">
        <Segmented value={theme} options={THEMES} onChange={setTheme} labels={THEME_LABEL} />
      </SettingRow>

      <SettingRow label="主题" desc="拖动滑块在亮色与暗色之间切换">
        <div className="w-64">
          <EnumSlider
            label="主题"
            values={THEMES}
            value={theme}
            onChange={setTheme}
            format={(value) => THEME_LABEL[value]}
          />
        </div>
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
