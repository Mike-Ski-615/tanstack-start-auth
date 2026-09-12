import { createFileRoute } from "@tanstack/react-router";

import { TextFontIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow, Segmented } from "#components/settings/setting-row";
import { InlineSlider } from "#components/ui/inline-slider";
import { FONT_SCALE_LABEL, fontScale } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/font")({
  component: FontSetting,
});

const SCALES = ["small", "default", "large"] as const;

function FontSetting() {
  const { value, setValue } = fontScale.usePreference();

  return (
    <SettingPage title="字号" desc="全局文字缩放比例，影响所有 rem 尺寸" icon={TextFontIcon}>
      <SettingRow label="字号" desc="全局文字缩放比例，影响所有 rem 尺寸">
        <Segmented value={value} options={SCALES} onChange={setValue} labels={FONT_SCALE_LABEL} />
      </SettingRow>

      <SettingRow label="滑块选择" desc="拖动滑块调整全局字号">
        <div className="w-64">
          <InlineSlider
            label="字号"
            values={SCALES}
            value={value}
            onChange={setValue}
            format={(option) => FONT_SCALE_LABEL[option]}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-semibold">标题 Heading</div>
          <div className="text-base">正文段落文字，用于查看基准字号效果。</div>
          <div className="text-sm text-muted-foreground">
            次要说明文字 · 当前 {FONT_SCALE_LABEL[value]}
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
