import { createFileRoute } from "@tanstack/react-router";

import { RulerIcon } from "@hugeicons/core-free-icons";

import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { Card, CardContent } from "#components/ui/card";
import { Input } from "#components/ui/input";
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
          <Card className="w-fit">
            <CardContent>卡片</CardContent>
          </Card>
          <Button>按钮</Button>
          <Input readOnly value="输入框" className="w-40" />
          <Badge>胶囊</Badge>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
