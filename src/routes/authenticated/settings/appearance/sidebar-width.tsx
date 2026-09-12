import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SidebarLeft01Icon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow } from "#components/settings/setting-row";
import { NumberSlider } from "#components/ui/number-slider";
import { SIDEBAR_WIDTH_BOUNDS, readSidebarWidth, writeSidebarWidth } from "#lib/sidebar-width";

export const Route = createFileRoute("/authenticated/settings/appearance/sidebar-width")({
  component: SidebarWidthSetting,
});

function SidebarWidthSetting() {
  const [width, setWidth] = useState(SIDEBAR_WIDTH_BOUNDS.fallback);

  useEffect(() => {
    setWidth(readSidebarWidth());
  }, []);

  const commit = useCallback((next: number) => {
    setWidth(writeSidebarWidth(next));
  }, []);

  return (
    <SettingPage
      title="侧边栏宽度"
      desc="调整左侧导航栏的宽度，也与拖动侧边栏边缘的效果同步。"
      icon={SidebarLeft01Icon}
    >
      <SettingRow
        label="宽度"
        desc={`范围 ${SIDEBAR_WIDTH_BOUNDS.min}–${SIDEBAR_WIDTH_BOUNDS.max} 像素`}
      >
        <div className="w-72">
          <NumberSlider
            label="侧边栏"
            value={width}
            min={SIDEBAR_WIDTH_BOUNDS.min}
            max={SIDEBAR_WIDTH_BOUNDS.max}
            step={4}
            onChange={setWidth}
            onCommit={commit}
            format={(v) => `${v}px`}
          />
        </div>
      </SettingRow>

      <SettingRow label="预设" desc="快速套用常用宽度">
        <div className="flex items-center gap-2">
          {[
            { label: "窄", value: 200 },
            { label: "标准", value: 256 },
            { label: "宽", value: 320 },
            { label: "超宽", value: 400 },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => commit(preset.value)}
              className={
                width === preset.value
                  ? "rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm ring-1 ring-border"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </SettingRow>

      <PreviewBox>
        <div className="flex h-40 gap-0 overflow-hidden rounded-lg border">
          <div
            className="flex shrink-0 flex-col gap-1.5 bg-sidebar p-2 transition-[width] duration-200"
            style={{ width: `${Math.min(width, 260)}px` }}
          >
            <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-1.5 text-xs text-sidebar-accent-foreground">
              <div className="size-4 shrink-0 rounded-full bg-sidebar-primary" />
              <span className="truncate">导航项</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/70">
              <div className="size-4 shrink-0 rounded-full bg-sidebar-foreground/20" />
              <span className="truncate">导航项</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-sidebar-foreground/70">
              <div className="size-4 shrink-0 rounded-full bg-sidebar-foreground/20" />
              <span className="truncate">导航项</span>
            </div>
          </div>
          <div className="flex-1 bg-background p-3">
            <div className="flex flex-col gap-2">
              <div className="h-2 w-2/3 rounded bg-muted" />
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-5/6 rounded bg-muted" />
            </div>
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
