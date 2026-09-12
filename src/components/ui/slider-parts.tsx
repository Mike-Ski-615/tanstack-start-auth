import { motion, type MotionValue } from "motion/react";

import { cn } from "#lib/utils";

/** Shared track shell: full-width, 40px tall, rounded, muted, with the
 * touch gesture affordance the pointer handling in both sliders relies on. */
export const SLIDER_TRACK_CLASS =
  "relative h-10 w-full touch-none select-none overflow-hidden rounded-[8px] bg-muted";

export function sliderTrackClass(disabled: boolean | undefined, className?: string) {
  return cn(
    SLIDER_TRACK_CLASS,
    disabled ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing",
    className,
  );
}

/** The inset progress fill: a full-width rounded rect slid left so only its
 * right edge (the rounded corner) is visible, never stretching mid-drag. */
export function SliderFill({ x }: { x: MotionValue<number> }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 inset-y-0 overflow-hidden"
    >
      <motion.div className="absolute inset-0 rounded-[8px] bg-foreground/15" style={{ x }} />
    </div>
  );
}

/** A 4px tick dot centred vertically, placed by its left edge. */
export function SliderTick({ left }: { left: number }) {
  return (
    <span
      className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-foreground/25"
      style={{ left }}
    />
  );
}
