import * as React from "react";
import { animate, motion, type HTMLMotionProps } from "motion/react";
import { cn } from "#lib/utils";
import { SIDEBAR_WIDTH_PX, useSidebar } from "#components/ui/sidebar";

const SIDEBAR_COLLAPSE_THRESHOLD_PX = 128;
const OVERSHOOT_RESISTANCE = 0.35;

export function SidebarTrigger({
  className,
  ...props
}: HTMLMotionProps<"div">) {
  const { width, open, setOpen } = useSidebar();
  const startWidth = React.useRef(0);

  return (
    <motion.div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={0}
      aria-valuemax={SIDEBAR_WIDTH_PX}
      aria-valuenow={open ? SIDEBAR_WIDTH_PX : 0}
      tabIndex={0}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      dragMomentum={false}
      onDragStart={() => {
        // Kill any in-flight spring so the handle tracks the pointer instantly.
        width.stop();
        startWidth.current = width.get();
      }}
      onDrag={(_, info) => {
        const raw = startWidth.current + info.offset.x;
        // Rubber band: let the sidebar overshoot past max, with resistance.
        const next =
          raw > SIDEBAR_WIDTH_PX
            ? SIDEBAR_WIDTH_PX + (raw - SIDEBAR_WIDTH_PX) * OVERSHOOT_RESISTANCE
            : Math.max(0, raw);
        width.set(next);
      }}
      onDragEnd={() => {
        const next = width.get() > SIDEBAR_COLLAPSE_THRESHOLD_PX;
        // Spring back to the settled width (overshoot bounces back here).
        animate(width, next ? SIDEBAR_WIDTH_PX : 0, {
          type: "spring",
          stiffness: 400,
          damping: 30,
        });
        setOpen(next);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "Home") setOpen(false);
        if (event.key === "ArrowRight" || event.key === "End") setOpen(true);
      }}
      className={cn(
        "group sticky top-0 ml-2 flex h-svh w-2.5 shrink-0 cursor-ew-resize touch-none items-center self-start select-none focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="h-80 w-full rounded-full bg-sidebar-foreground/20 transition-colors group-hover:bg-sidebar-foreground/40 group-focus-visible:ring-2 group-focus-visible:ring-ring"
      />
    </motion.div>
  );
}
