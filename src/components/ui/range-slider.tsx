import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useEffect, useLayoutEffect, useState } from "react";

import { SliderFill, SliderTick, sliderTrackClass } from "#components/ui/slider-parts";
import { SPRING_BOUNCY, SPRING_GLIDE } from "#lib/ease";
import {
  HANDLE_END_INSET,
  HANDLE_START,
  type SliderOptions,
  useSlider,
} from "#lib/hooks/use-slider";

export interface RangeSliderProps extends SliderOptions {
  /** Render a tick dot at each step. */
  showTicks?: boolean;
  className?: string;
}

export function RangeSlider({ showTicks = true, className, ...options }: RangeSliderProps) {
  const reduce = useReducedMotion();
  const { percent, dragging, min, max, step, trackProps, sliderProps } = useSlider(options);
  const [trackWidth, setTrackWidth] = useState(292);
  useLayoutEffect(() => {
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
  const target = useMotionValue(percent);
  useEffect(() => {
    target.set(percent);
  }, [percent, target]);
  const smooth = useSpring(target, SPRING_GLIDE);
  const pos = reduce ? target : smooth;
  const travel = Math.max(0, trackWidth - HANDLE_START - HANDLE_END_INSET);
  const thumbX = useTransform(pos, (p) => HANDLE_START + travel * p / 100);
  // Same as InlineSlider: the fill is a full-width rounded rect slid left.
  // Its right edge stays 8px past the handle centre (left edge + 2 + 8),
  // snapping to the full track width once the handle reaches its end inset.
  const fillX = useTransform(thumbX, (x) => {
    const right = x >= trackWidth - HANDLE_END_INSET ? trackWidth : x + 10;
    return right - trackWidth;
  });

  // Floor rather than round, so a range the step does not divide (0 to 10 by 4)
  // stops its dots at the last whole step instead of drawing one past max.
  // toFixed comes first because 0.3/0.1 is 2.9999999999999996, which would
  // floor to 2 and drop the last dot.
  const steps = Math.floor(Number(((max - min) / step).toFixed(6)));
  const ticks =
    showTicks && steps > 0 && steps <= 50
      ? Array.from({ length: steps + 1 }, (_, i) => Number((min + i * step).toFixed(6)))
      : [];

  return (
    <div
      {...trackProps}
      className={sliderTrackClass(options.disabled, className)}
    >
      <SliderFill x={fillX} />

      {/* Tick left edges sit on the same inset path as the handle, so each
          dot's centre lines up with the handle centre. */}
      <div className="pointer-events-none absolute inset-y-0">
        {ticks.map((t) => {
          const p = (t - min) / (max - min);
          return <SliderTick key={t} left={HANDLE_START + travel * p} />;
        })}
      </div>

      {/* Keep the handle inside the rounded progress fill at both ends. */}
      <motion.div
        {...sliderProps}
        animate={reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }}
        transition={SPRING_BOUNCY}
        className="absolute left-0 top-2 h-6 w-1 rounded-full bg-foreground outline-none ring-inset ring-foreground/30 focus-visible:ring-4"
        style={{ x: thumbX }}
      />
    </div>
  );
}
