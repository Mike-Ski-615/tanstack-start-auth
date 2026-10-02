import { createFileRoute } from "@tanstack/react-router";

import { DropletIcon } from "@hugeicons/core-free-icons";

import { SettingPage, SettingRow } from "#components/settings/setting-row";
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
    </SettingPage>
  );
}
