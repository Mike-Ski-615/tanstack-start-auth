import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { TextFontIcon } from "@hugeicons/core-free-icons";

import {
  PreviewBox,
  PreviewCell,
  PreviewGrid,
  SettingPage,
  SettingRow,
} from "#components/settings/setting-row";
import { Button } from "#components/ui/button";
import { RangeSlider } from "#components/ui/range-slider";
import { FONT_SCALE_RANGE, fontScale } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/font")({
  component: FontSetting,
});

// 浏览器默认根字号：100% 缩放时的基准，仅用于预览换算。
const BASE_PX = 16;

const SAMPLE = [
  { label: "H1", em: 2.25, className: "font-bold tracking-tight" },
  { label: "H2", em: 1.875, className: "font-semibold tracking-tight" },
  { label: "H3", em: 1.5, className: "font-semibold" },
  { label: "H4", em: 1.25, className: "font-medium" },
  { label: "Body", em: 1, className: "" },
  { label: "Small", em: 0.875, className: "text-muted-foreground" },
];

const FONT_SCALE_DEFAULT = String(FONT_SCALE_RANGE.fallback);

function FontSetting() {
  const { value, setValue } = fontScale.usePreference();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const scale = Number(draft);
  const dirty = draft !== value;

  return (
    <SettingPage title="字号" desc="全局文字缩放比例，影响所有 rem 尺寸" icon={TextFontIcon}>
      <SettingRow label="字号" desc={`${FONT_SCALE_RANGE.min}%–${FONT_SCALE_RANGE.max}% 连续缩放`}>
        <div className="w-64">
          <RangeSlider
            value={scale}
            min={FONT_SCALE_RANGE.min}
            max={FONT_SCALE_RANGE.max}
            step={FONT_SCALE_RANGE.step}
            onValueChange={(next) => setDraft(String(next))}
            aria-label="字号"
            formatValueText={(v) => `${v}%`}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <PreviewGrid>
          {SAMPLE.map(({ label, em, className }) => (
            <PreviewCell key={label}>
              {/* 字号直接由草稿换算成 px：不依赖 rem，因此无需应用即可实时预览。 */}
              <span className={className} style={{ fontSize: `${(BASE_PX * scale * em) / 100}px` }}>
                {label}
              </span>
            </PreviewCell>
          ))}
        </PreviewGrid>
      </PreviewBox>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDraft(FONT_SCALE_DEFAULT);
            setValue(FONT_SCALE_DEFAULT);
          }}
        >
          重置
        </Button>
        <Button type="button" onClick={() => setValue(draft)} disabled={!dirty}>
          应用
        </Button>
      </div>
    </SettingPage>
  );
}
