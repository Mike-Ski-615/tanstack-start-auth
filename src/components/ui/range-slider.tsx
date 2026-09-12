import * as React from "react";

import { cn } from "#lib/utils";
import { snapSliderValue, type SliderOptions, useSlider } from "#lib/hooks/use-slider";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "#lib/touch";
import { useReducedMotion } from "#hooks/use-reduced-motion";

export interface RangeSliderProps extends SliderOptions {
  showTicks?: boolean;
  className?: string;
}

export function RangeSlider({ showTicks = true, className, ...options }: RangeSliderProps) {
  const reduce = useReducedMotion();
  const { current, min, max, step, disabled, commit, trackProps, sliderProps } = useSlider(options);
  const [trackWidth, setTrackWidth] = React.useState(292);
  const [dragging, setDragging] = React.useState(false);
  const gesture = React.useRef<{ id: number; moved: boolean } | null>(null);

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

  const span = max - min || 1;
  const percent = Math.min(100, Math.max(0, ((current - min) / span) * 100));

  // 原生弹簧平滑: rAF 逼近目标百分比（替代 motion 的 useSpring）。
  const [smooth, setSmooth] = React.useState(percent);
  const smoothRef = React.useRef(percent);
  smoothRef.current = smooth;
  const velocity = React.useRef(0);
  const frame = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (reduce) {
      setSmooth(percent);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.064, (now - last) / 1000);
      last = now;
      const value = smoothRef.current;
      const delta = percent - value;
      if (Math.abs(delta) < 0.05 && Math.abs(velocity.current) < 1) {
        setSmooth(percent);
        frame.current = null;
        return;
      }
      const stiffness = 170;
      const damping = 26;
      velocity.current += (-stiffness * delta - damping * velocity.current) * dt;
      setSmooth(value + velocity.current * dt);
      frame.current = requestAnimationFrame(tick);
    };
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    velocity.current = 0;
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [percent, reduce]);

  const FILL_INSET_X = 0;
  const FILL_INSET_Y = 3;

  const pos = reduce || dragging ? percent : smooth;
  const thumbX = 8 + Math.max(0, trackWidth - 20) * (pos / 100);
  const fillWidth = Math.max(0, (pos >= 100 ? trackWidth - 2 : (pos / 100) * (trackWidth - 20) + 14) - FILL_INSET_X);

  const valueAt = (clientX: number) => {
    const rect = trackProps.ref.current?.getBoundingClientRect();
    if (!rect || !rect.width) return undefined;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return snapSliderValue(min + ratio * span, min, max, step);
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gesture.current || gesture.current.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    releasePointer(event.currentTarget, event.pointerId);
  };

  const steps = Math.floor(Number(((max - min) / step).toFixed(6)));
  const ticks =
    showTicks && steps > 0 && steps <= 50
      ? Array.from({ length: steps + 1 }, (_, i) => Number((min + i * step).toFixed(6)))
      : [];

  const stepBy = (delta: number) => commit(Math.min(max, Math.max(min, current + delta)));

  return (
    <div
      ref={trackProps.ref}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0 || gesture.current) return;
        const next = valueAt(event.clientX);
        if (next === undefined) return;
        event.preventDefault();
        gesture.current = { id: event.pointerId, moved: false };
        setDragging(true);
        commit(next);
        capturePointer(event.currentTarget, event.pointerId);
        event.currentTarget
          .querySelector<HTMLElement>("[role=slider]")
          ?.focus({ preventScroll: true });
      }}
      onPointerMove={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId || disabled) return;
        active.moved = true;
        const next = valueAt(event.clientX);
        if (next !== undefined && next !== current) commit(next);
      }}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      className={cn(
        "relative flex h-10 w-full touch-none items-center overflow-hidden rounded-lg bg-muted",
        TOUCH_GESTURE_CLASS,
        disabled ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute overflow-hidden rounded-lg"
        style={{ left: FILL_INSET_X, top: FILL_INSET_Y, width: fillWidth, bottom: FILL_INSET_Y }}
      >
        <div className="absolute inset-0 rounded-md bg-foreground/15" />
      </div>

      <div className="pointer-events-none absolute inset-x-[10px] inset-y-0">
        {ticks.map((t) => {
          const tp = ((t - min) / span) * 100;
          return (
            <span
              key={t}
              className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
              style={{ left: `${tp}%` }}
            />
          );
        })}
      </div>

      <div
        {...sliderProps}
        className={cn(
          "absolute top-1/2 left-0 h-6 w-1 rounded-full bg-foreground outline-none ring-inset ring-foreground/30",
          "focus-visible:ring-4",
        )}
        style={{
          transform: `translate(${thumbX}px, -50%) scaleY(${dragging ? 1.35 : 1})`,
          transition: "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          const next: number | undefined = {
            ArrowRight: Math.min(max, current + step),
            ArrowUp: Math.min(max, current + step),
            ArrowLeft: Math.max(min, current - step),
            ArrowDown: Math.max(min, current - step),
            Home: min,
            End: max,
            PageUp: max,
            PageDown: min,
          }[event.key];
          if (next !== undefined) {
            event.preventDefault();
            stepBy(next - current);
          }
        }}
      />
    </div>
  );
}
