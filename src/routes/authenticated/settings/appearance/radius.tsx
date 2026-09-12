import { createFileRoute } from "@tanstack/react-router";

import { RulerIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { RangeSlider } from "#components/ui/range-slider";
import { RADIUS_RANGE, radius } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/radius")({
  component: RadiusSetting,
});

function RadiusSetting() {
  const { value, setValue } = radius.usePreference();
  const px = Number(value);

  return (
    <SettingPage title="圆角" desc="卡片、按钮与输入框的圆角大小" icon={RulerIcon}>
      <SettingRow label="圆角" desc={`${RADIUS_RANGE.min}–${RADIUS_RANGE.max}px 连续可调`}>
        <div className="w-64">
          <RangeSlider
            value={px}
            min={RADIUS_RANGE.min}
            max={RADIUS_RANGE.max}
            step={RADIUS_RANGE.step}
            onValueChange={(next) => setValue(String(next))}
            aria-label="圆角"
            formatValueText={(v) => `${v}px`}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border bg-background px-4 py-3 text-sm">卡片 rounded-lg</div>
          <div className="rounded-xl border bg-background px-4 py-3 text-sm">卡片 rounded-xl</div>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            按钮
          </button>
          <input
            readOnly
            value="输入框"
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none"
          />
          <div className="rounded-full border bg-background px-3 py-1 text-xs">圆角胶囊</div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
