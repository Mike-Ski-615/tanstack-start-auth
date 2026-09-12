import { createFileRoute } from "@tanstack/react-router";

import { RulerIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow, Segmented } from "#components/settings/setting-row";
import { InlineSlider } from "#components/ui/inline-slider";
import { RADIUS_LABEL, radius } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/radius")({
  component: RadiusSetting,
});

const RADII = ["sharp", "default", "round"] as const;

function RadiusSetting() {
  const { value, setValue } = radius.usePreference();

  return (
    <SettingPage title="圆角" desc="卡片、按钮与输入框的圆角大小" icon={RulerIcon}>
      <SettingRow label="圆角" desc="卡片、按钮与输入框的圆角大小">
        <Segmented value={value} options={RADII} onChange={setValue} labels={RADIUS_LABEL} />
      </SettingRow>

      <SettingRow label="滑块选择" desc="拖动滑块调整圆角半径">
        <div className="w-64">
          <InlineSlider
            label="圆角"
            values={RADII}
            value={value}
            onChange={setValue}
            format={(option) => RADIUS_LABEL[option]}
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
