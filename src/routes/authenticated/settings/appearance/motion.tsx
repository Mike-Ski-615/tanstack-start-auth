import { createFileRoute } from "@tanstack/react-router";
import { Motion01Icon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow, Segmented } from "#components/settings/setting-row";
import { InlineSlider } from "#components/ui/inline-slider";
import { MOTION_LABEL, motion } from "#provider/appearance-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/motion")({
  component: MotionSetting,
});

const MODES = ["system", "full", "reduced"] as const;

function MotionSetting() {
  const { value, setValue } = motion.usePreference();

  return (
    <SettingPage
      title="动画"
      desc="控制系统动画与过渡效果。关闭后，界面切换与滑块回弹会立即完成。"
      icon={Motion01Icon}
    >
      <SettingRow label="动画效果" desc="跟随系统时会尊重操作系统的「减少动态效果」设置">
        <Segmented value={value} options={MODES} onChange={setValue} labels={MOTION_LABEL} />
      </SettingRow>

      <SettingRow label="滑块选择" desc="拖动滑块切换动画偏好">
        <div className="w-72">
          <InlineSlider
            label="动画"
            values={MODES}
            value={value}
            onChange={setValue}
            format={(mode) => MOTION_LABEL[mode]}
          />
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex items-center gap-3">
          <div className="size-10 animate-spin rounded-lg bg-primary [animation-duration:1.6s]" />
          <div className="h-10 w-24 rounded-lg bg-muted transition-colors duration-500 hover:bg-primary" />
          <span className="text-xs text-muted-foreground">
            当前：{MOTION_LABEL[value]}（悬停色块查看过渡）
          </span>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
