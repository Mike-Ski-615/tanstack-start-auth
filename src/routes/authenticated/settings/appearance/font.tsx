import { createFileRoute } from "@tanstack/react-router";

import { TextFontIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { RangeSlider } from "#components/ui/range-slider";
import { FONT_SCALE_RANGE, fontScale } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/font")({
  component: FontSetting,
});

function FontSetting() {
  const { value, setValue } = fontScale.usePreference();
  const scale = Number(value);

  return (
    <SettingPage title="字号" desc="全局文字缩放比例，影响所有 rem 尺寸" icon={TextFontIcon}>
      <SettingRow label="字号" desc={`${FONT_SCALE_RANGE.min}%–${FONT_SCALE_RANGE.max}% 连续缩放`}>
        <div className="w-64">
          <RangeSlider
            value={scale}
            min={FONT_SCALE_RANGE.min}
            max={FONT_SCALE_RANGE.max}
            step={FONT_SCALE_RANGE.step}
            onValueChange={(next) => setValue(String(next))}
            aria-label="字号"
            formatValueText={(v) => `${v}%`}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-semibold">标题 Heading</div>
          <div className="text-base">正文段落文字，用于查看基准字号效果。</div>
          <div className="text-sm text-muted-foreground">次要说明文字 · 当前 {scale}%</div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
