import { createFileRoute } from "@tanstack/react-router";

import { DropletIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { InlineSlider } from "#components/ui/inline-slider";
import { ACCENT_LABEL, ACCENT_SWATCH, accent } from "#provider/appearance-provider";
import { cn } from "#lib/utils";

export const Route = createFileRoute("/authenticated/settings/appearance/accent")({
  component: AccentSetting,
});

const ACCENTS = ["orange", "blue", "green", "violet", "rose"] as const;

function AccentSetting() {
  const { value, setValue } = accent.usePreference();

  return (
    <SettingPage title="主题色" desc="按钮、链接与高亮的主色调" icon={DropletIcon}>
      <SettingRow label="主题色" desc="按钮、链接与高亮的主色调">
        <div className="flex items-center gap-2">
          {ACCENTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setValue(option)}
              aria-label={ACCENT_LABEL[option]}
              aria-pressed={value === option}
              title={ACCENT_LABEL[option]}
              style={{ backgroundColor: ACCENT_SWATCH[option] }}
              className={cn(
                "size-7 rounded-full border border-black/10 transition-all dark:border-white/20",
                value === option
                  ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "opacity-70 hover:opacity-100",
              )}
            />
          ))}
        </div>
      </SettingRow>

      <SettingRow label="滑块选择" desc="拖动滑块逐个切换主题色">
        <div className="w-64">
          <InlineSlider
            label="主题色"
            values={ACCENTS}
            value={value}
            onChange={setValue}
            format={(option) => ACCENT_LABEL[option]}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
          >
            主要按钮
          </button>
          <button
            type="button"
            className="rounded-lg border border-primary px-3 py-2 text-sm text-primary"
          >
            次要按钮
          </button>
          <a href="#" className="text-sm text-primary underline underline-offset-4">
            链接文字
          </a>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary">标签</span>
          <div className="flex h-8 w-24 items-end gap-1">
            {[40, 70, 55, 90, 65].map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
