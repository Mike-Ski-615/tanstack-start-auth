import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ScriptOnce } from "@tanstack/react-router";

export type ContentWidth = "full" | "wide" | "narrow";

export const CONTENT_WIDTH_CLASS = "content-region";

export const SIDEBAR_GUTTER_CLASS = "lg:ps-7";

export const CONTENT_WIDTH_LABEL: Record<ContentWidth, string> = {
  full: "通栏",
  wide: "宽",
  narrow: "窄",
};

const ORDER: ContentWidth[] = ["narrow", "wide", "full"];

const STORAGE_KEY = "content-width";
const DEFAULT_WIDTH: ContentWidth = "full";

function getWidthScript() {
  const key = JSON.stringify(STORAGE_KEY);
  const fallback = JSON.stringify(DEFAULT_WIDTH);
  const valid = JSON.stringify(ORDER);

  return `(function(){var w;try{w=localStorage.getItem(${key})}catch(e){}if(${valid}.indexOf(w)<0){w=${fallback}}document.documentElement.setAttribute('data-content-width',w)})();`;
}

function applyWidth(w: ContentWidth) {
  document.documentElement.setAttribute("data-content-width", w);
}

type ContentWidthState = {
  width: ContentWidth;
  setWidth: (w: ContentWidth) => void;
  cycle: () => void;
};

const ContentWidthContext = createContext<ContentWidthState>({
  width: DEFAULT_WIDTH,
  setWidth: () => {},
  cycle: () => {},
});

function isWidth(v: unknown): v is ContentWidth {
  return v === "full" || v === "wide" || v === "narrow";
}

export function ContentWidthProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidthState] = useState<ContentWidth>(DEFAULT_WIDTH);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-content-width");
    if (isWidth(current)) setWidthState(current);
    else applyWidth(DEFAULT_WIDTH);
  }, []);

  const setWidth = useCallback((w: ContentWidth) => {
    setWidthState(w);
    applyWidth(w);
    try {
      localStorage.setItem(STORAGE_KEY, w);
    } catch {}
  }, []);

  const cycle = useCallback(() => {
    setWidthState((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]!;
      applyWidth(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <ContentWidthContext.Provider value={{ width, setWidth, cycle }}>
      <ScriptOnce>{getWidthScript()}</ScriptOnce>
      {children}
    </ContentWidthContext.Provider>
  );
}

export function useContentWidth() {
  return useContext(ContentWidthContext);
}
