import { createFileRoute } from "@tanstack/react-router";

import { Maximize01Icon } from "@hugeicons/core-free-icons";

import { PreviewBox, SettingPage, SettingRow, Segmented } from "#components/settings/setting-row";
import {
  CONTENT_WIDTH_LABEL,
  CONTENT_WIDTH_ORDER,
  useContentWidth,
} from "#provider/content-width-provider";

export const Route = createFileRoute("/authenticated/settings/appearance/width")({
  component: WidthSetting,
});

function WidthSetting() {
  const { width, setWidth } = useContentWidth();

  return (
    <SettingPage title="内容宽度" desc="页面正文区域的最大宽度" icon={Maximize01Icon}>
      <SettingRow label="内容宽度" desc="页面正文区域的最大宽度">
        <Segmented
          value={width}
          options={CONTENT_WIDTH_ORDER}
          onChange={setWidth}
          labels={CONTENT_WIDTH_LABEL}
        />
      </SettingRow>

      <PreviewBox>
        <div className="rounded-lg border bg-muted/30 p-2">
          <div className="content-region rounded-md border border-dashed bg-background p-3">
            <div className="text-xs text-muted-foreground">
              正文区域 · 当前 {CONTENT_WIDTH_LABEL[width]}
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="h-2 w-full rounded bg-muted" />
              <div className="h-2 w-11/12 rounded bg-muted" />
              <div className="h-2 w-4/5 rounded bg-muted" />
            </div>
          </div>
        </div>
      </PreviewBox>
    </SettingPage>
  );
}
