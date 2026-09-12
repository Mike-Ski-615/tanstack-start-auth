import { createPreference } from "#provider/preference-provider";

export type ContentWidth = "full" | "wide" | "narrow";

export const CONTENT_WIDTH_CLASS = "content-region";

export const SIDEBAR_GUTTER_CLASS = "lg:ps-7";

export const CONTENT_WIDTH_LABEL: Record<ContentWidth, string> = {
  full: "通栏",
  wide: "宽",
  narrow: "窄",
};

export const CONTENT_WIDTH_ORDER: ContentWidth[] = ["narrow", "wide", "full"];

function applyWidth(value: ContentWidth) {
  document.documentElement.setAttribute("data-content-width", value);
}

const contentWidth = createPreference<ContentWidth>({
  key: "content-width",
  attribute: "data-content-width",
  values: CONTENT_WIDTH_ORDER,
  fallback: "full",
  apply: applyWidth,
});

export const ContentWidthProvider = contentWidth.Provider;

export function useContentWidth() {
  const { value, setValue } = contentWidth.usePreference();

  const cycle = () => {
    const next =
      CONTENT_WIDTH_ORDER[(CONTENT_WIDTH_ORDER.indexOf(value) + 1) % CONTENT_WIDTH_ORDER.length]!;
    setValue(next);
  };

  return { width: value, setWidth: setValue, cycle };
}
