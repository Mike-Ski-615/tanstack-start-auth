import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { RulerIcon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { Button } from "#components/ui/button";
import { EnumSlider } from "#components/ui/enum-slider";
import { RADIUS_DEFAULT, RADIUS_OPTIONS, radius } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/radius")({
  component: RadiusSetting,
});

/** 圆角特写：放大展示圆角的形状本身。 */
function RadiusCloseup({ rem }: { rem: number }) {
  const SCALE = 4;
  const r = rem * 16 * SCALE;
  const inset = 20;
  const size = 160;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 p-4">
      <svg
        viewBox="0 0 200 200"
        className="min-h-0 w-full max-w-64 flex-1"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* 圆角形状 */}
        <rect
          x={inset}
          y={inset}
          width={size}
          height={size}
          rx={r}
          className="fill-background stroke-border"
          strokeWidth="1"
        />
      </svg>

      <span className="font-mono text-xs tabular-nums text-muted-foreground">r = {rem}rem</span>
    </div>
  );
}

function RadiusSetting() {
  const { value, setValue } = radius.usePreference();
  const [draft, setDraft] = useState(value);

  // 已保存的值在别处变化时，让草稿跟上。
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const rem = Number.parseFloat(draft) || 0;
  const dirty = draft !== value;

  return (
    <SettingPage title="圆角" desc="卡片、按钮与输入框的圆角大小" icon={RulerIcon}>
      <SettingRow label="圆角" desc="直角到圆润，四个锚点">
        <div className="w-64">
          <EnumSlider
            label="圆角"
            values={RADIUS_OPTIONS}
            value={draft}
            onChange={setDraft}
            format={(v) => v}
          />
        </div>
      </SettingRow>

      <PreviewBox fill>
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <div className="min-h-0 flex-1">
            <RadiusCloseup rem={rem} />
          </div>
          {/* md 及以上：在预览右侧上下排列；md 以下：在预览下方左右排列 */}
          <div className="flex shrink-0 gap-2 md:w-24 md:flex-col">
            <Button
              type="button"
              variant="outline"
              className="flex-1 md:w-full md:flex-none"
              onClick={() => {
                setDraft(RADIUS_DEFAULT);
                setValue(RADIUS_DEFAULT);
              }}
            >
              重置
            </Button>
            <Button
              type="button"
              className="flex-1 md:w-full md:flex-none"
              onClick={() => setValue(draft)}
              disabled={!dirty}
            >
              应用
            </Button>
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
