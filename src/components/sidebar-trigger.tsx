import * as React from "react";
import { cn } from "#lib/utils";
import { useSidebar } from "#components/ui/sidebar";
import { SIDEBAR_WIDTH_BOUNDS, readSidebarWidth } from "#lib/sidebar-width";

const SIDEBAR_COLLAPSE_THRESHOLD_PX = 128;
const OVERSHOOT_RESISTANCE = 0.35;

export function SidebarTrigger({ className, ...props }: React.ComponentProps<"div">) {
  const { width, open, setOpen, setWidthPx, setDragging } = useSidebar();
  const startWidth = React.useRef(0);
  const startX = React.useRef(0);
  const dragging = React.useRef(false);
  const widthRef = React.useRef(width);
  widthRef.current = width;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    setDragging(true);
    startWidth.current = widthRef.current;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const { min, max } = SIDEBAR_WIDTH_BOUNDS;
    const raw = startWidth.current + (e.clientX - startX.current);
    const next =
      raw > max
        ? max + (raw - max) * OVERSHOOT_RESISTANCE
        : raw < min
          ? min - (min - raw) * OVERSHOOT_RESISTANCE
          : raw;
    setWidthPx(Math.max(0, next));
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setDragging(false);
    const next = widthRef.current > SIDEBAR_COLLAPSE_THRESHOLD_PX;
    setWidthPx(next ? readSidebarWidth() : 0);
    setOpen(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整侧边栏宽度"
      aria-valuemin={SIDEBAR_WIDTH_BOUNDS.min}
      aria-valuemax={SIDEBAR_WIDTH_BOUNDS.max}
      aria-valuenow={open ? Math.round(width) : 0}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "Home") setOpen(false);
        if (event.key === "ArrowRight" || event.key === "End") setOpen(true);
      }}
      className={cn(
        "group absolute left-2 top-1/2 z-20 -translate-y-1/2 hidden w-2.5 cursor-ew-resize touch-none select-none focus-visible:outline-none lg:flex",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="h-80 w-full rounded-full bg-sidebar-foreground/20 transition-colors group-hover:bg-sidebar-foreground/40 group-focus-visible:ring-2 group-focus-visible:ring-ring"
      />
    </div>
  );
}
