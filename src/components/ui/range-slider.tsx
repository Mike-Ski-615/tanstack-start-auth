import * as React from "react";

import { cn } from "#lib/utils";
import { SPRING_BOUNCY, SPRING_GLIDE } from "#lib/ease";
import { type SliderOptions, useSlider } from "#lib/hooks/use-slider";
import { useSpringValue } from "#lib/hooks/use-spring";
import { TOUCH_GESTURE_CLASS } from "#lib/touch";
import { useReducedMotion } from "#hooks/use-reduced-motion";

export interface RangeSliderProps extends SliderOptions {
  showTicks?: boolean;
  className?: string;
}

export function RangeSlider({ showTicks = true, className, ...options }: RangeSliderProps) {
  const reduce = useReducedMotion();
  const { percent, dragging, min, max, step, trackProps, sliderProps } = useSlider(options);
  const [trackWidth, setTrackWidth] = React.useState(292);

  React.useLayoutEffect(() => {
    const track = trackProps.ref.current;
    if (!track) return;
    const measure = () => {
      const width = track.getBoundingClientRect().width;
      if (width > 0) setTrackWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [trackProps.ref]);

  // Spring-smoothed position drives both the thumb and the fill.
  const { value: pos } = useSpringValue(percent, SPRING_GLIDE, { enabled: !reduce });
  // Bouncy grab feedback for the thumb scale only.
  const { value: scaleY } = useSpringValue(dragging ? 1.35 : 1, SPRING_BOUNCY, {
    enabled: !reduce,
  });

  const thumbX = 8 + (Math.max(0, trackWidth - 20) * pos) / 100;
  // Match InlineSlider: the 4px handle starts 8px inside the track, and
  // the rounded fill extends 8px past its left edge. Translate a full-size
  // fill inside the 2px inset clip so its corner never stretches.
  const FILL_INSET_Y = 3;
  const fillWidth = Math.max(0, pos >= 100 ? trackWidth - 2 : ((trackWidth - 20) * pos) / 100 + 14);

  // Floor rather than round, so a range the step does not divide (0 to 10 by 4)
  // stops its dots at the last whole step instead of drawing one past max.
  const steps = Math.floor(Number(((max - min) / step).toFixed(6)));
  const ticks =
    showTicks && steps > 0 && steps <= 50
      ? Array.from({ length: steps + 1 }, (_, i) => Number((min + i * step).toFixed(6)))
      : [];



  return (
    <div
      {...trackProps}
      className={cn(
        "relative flex h-10 w-full touch-none items-center overflow-hidden rounded-lg bg-muted",
        TOUCH_GESTURE_CLASS,
        options.disabled
          ? "pointer-events-none opacity-50"
          : "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute overflow-hidden rounded-lg"
        style={{ left: 0, top: FILL_INSET_Y, width: fillWidth, bottom: FILL_INSET_Y }}
      >
        <div className="absolute inset-0 rounded-md bg-foreground/15" />
      </div>

      {/* Tick centres follow the same inset path as the handle centre. */}
      <div className="pointer-events-none absolute inset-x-[10px] inset-y-0">
        {ticks.map((t) => {
          const tp = ((t - min) / (max - min)) * 100;
          return (
            <span
              key={t}
              className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
              style={{ left: `${tp}%` }}
            />
          );
        })}
      </div>

      {/* Keep the handle inside the rounded progress fill at both ends. */}
      <div
        {...sliderProps}
        className={cn(
          "absolute top-1/2 left-0 h-6 w-1 rounded-full bg-foreground outline-none",
          "ring-foreground/30 ring-inset focus-visible:ring-4",
        )}
        style={{
          transform: `translate(${thumbX}px, -50%) scaleY(${scaleY})`,
        }}
      />
    </div>
  );
}
