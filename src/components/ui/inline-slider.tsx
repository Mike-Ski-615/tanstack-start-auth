import * as React from "react";

import { cn } from "#lib/utils";
import { SPRING_BOUNCY, SPRING_GLIDE } from "#lib/ease";
import { createSpringSolution } from "#lib/spring";
import { type SliderOptions, snapSliderValue, useSlider } from "#lib/hooks/use-slider";
import { useSpringValue } from "#lib/hooks/use-spring";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "#lib/touch";
import { useReducedMotion } from "#hooks/use-reduced-motion";

const STOP_COUNT = 10;
const HANDLE_START = 8;
const HANDLE_END_INSET = 12;
const TEXT_INSET = 20;

type Stop = { value: number; x: number };

function mapBetweenStops(stops: Stop[], point: number, from: keyof Stop, to: keyof Stop) {
  const upperIndex = stops.findIndex((stop) => stop[from] >= point);
  const upper = stops[upperIndex < 0 ? stops.length - 1 : upperIndex]!;
  const lower = stops[Math.max(0, upperIndex - 1)]!;
  if (lower[from] === upper[from]) return upper[to];
  return lower[to] + ((point - lower[from]) / (upper[from] - lower[from])) * (upper[to] - lower[to]);
}

function nearestStop(stops: Stop[], x: number) {
  return stops.reduce((nearest, stop) =>
    Math.abs(stop.x - x) < Math.abs(nearest.x - x) ? stop : nearest,
  );
}

export interface InlineSliderProps extends SliderOptions {
  step?: number;
  label: string;
  format?: (value: number) => string;
  showTicks?: boolean;
  className?: string;
}

export function InlineSlider({
  label,
  format = String,
  showTicks = true,
  className,
  ...options
}: InlineSliderProps) {
  const reduce = useReducedMotion();
  const step = options.step && options.step > 0 ? options.step : 1;
  const precision = step.toFixed(6).replace(/0+$/, "").split(".")[1]?.length ?? 0;
  const { current, min, max, commit, trackProps, sliderProps } = useSlider({
    ...options,
    step: 10 ** -precision,
    "aria-label": options["aria-label"] ?? label,
    formatValueText: options.formatValueText ?? format,
  });

  const labelRef = React.useRef<HTMLSpanElement>(null);
  const readoutRef = React.useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = React.useState({
    width: 292,
    labelWidth: 22,
    readoutWidth: 24,
  });
  const [dragging, setDragging] = React.useState(false);
  const dragFrame = React.useRef<number | null>(null);
  const pendingDragValue = React.useRef<number | null>(null);
  const gesture = React.useRef<{
    id: number;
    left: number;
    offset: number;
    x: number;
  } | null>(null);

  React.useLayoutEffect(() => {
    const track = trackProps.ref.current;
    const labelElement = labelRef.current;
    const readout = readoutRef.current;
    if (!track || !labelElement || !readout) return;
    const measure = () => {
      const width = track.getBoundingClientRect().width;
      if (!width) return;
      const next = {
        width,
        labelWidth: labelElement.getBoundingClientRect().width,
        readoutWidth: readout.getBoundingClientRect().width,
      };
      setGeometry((previous) =>
        previous.width === next.width &&
        previous.labelWidth === next.labelWidth &&
        previous.readoutWidth === next.readoutWidth
          ? previous
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(labelElement);
    observer.observe(readout);
    return () => observer.disconnect();
  }, [trackProps.ref]);

  // Each stop owns both a value and a physical position.
  const endX = Math.max(HANDLE_START, geometry.width - HANDLE_END_INSET);
  const stops = React.useMemo(() => {
    const values = [
      ...new Set(
        Array.from({ length: STOP_COUNT }, (_, index) =>
          snapSliderValue(min + (index / (STOP_COUNT - 1)) * (max - min), min, max, step),
        ),
      ),
    ];
    return values.map((value, index) => ({
      value,
      x:
        values.length === 1
          ? HANDLE_START
          : HANDLE_START + (index / (values.length - 1)) * (endX - HANDLE_START),
    }));
  }, [min, max, step, endX]);

  const restingX = mapBetweenStops(stops, current, "value", "x");

  // One value owns the thumb for the entire gesture. Pointer movement writes
  // pixels directly; only release/click/keyboard changes use a spring.
  const [handleX, setHandleX] = React.useState(restingX);
  const handleXRef = React.useRef(restingX);
  const restingTarget = React.useRef(restingX);
  const frameRef = React.useRef<number | null>(null);

  const applyX = React.useCallback((next: number) => {
    handleXRef.current = next;
    setHandleX(next);
  }, []);

  const stopSpring = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const settleTo = React.useCallback(
    (x: number) => {
      restingTarget.current = x;
      stopSpring();
      if (reduce) {
        applyX(x);
        return;
      }
      const from = handleXRef.current;
      if (from === x) return;
      const solution = createSpringSolution(SPRING_GLIDE, from, x);
      const start = performance.now();
      const tickStep = (now: number) => {
        const elapsed = (now - start) / 1000;
        if (elapsed >= solution.duration) {
          applyX(x);
          frameRef.current = null;
          return;
        }
        applyX(solution.at(elapsed).value);
        frameRef.current = requestAnimationFrame(tickStep);
      };
      frameRef.current = requestAnimationFrame(tickStep);
    },
    [applyX, reduce, stopSpring],
  );

  React.useLayoutEffect(() => {
    if (gesture.current || restingTarget.current === restingX) return;
    settleTo(restingX);
  }, [restingX, settleTo]);

  React.useEffect(
    () => () => {
      stopSpring();
      if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    },
    [stopSpring],
  );

  const FILL_INSET_X = 0;
  const FILL_INSET_Y = 3;
  const fillRight = handleX >= endX ? geometry.width - 2 : handleX + 8;
  const fillWidth = Math.max(0, fillRight - FILL_INSET_X);

  // Part progressively over six pixels at each text edge.
  const split = React.useMemo(() => {
    const overlap = (start: number, end: number) =>
      Math.max(0, Math.min(1, (handleX + 4 - start) / 6, (end - handleX) / 6));
    return Math.max(
      overlap(TEXT_INSET, TEXT_INSET + geometry.labelWidth),
      overlap(geometry.width - TEXT_INSET - geometry.readoutWidth, geometry.width - TEXT_INSET),
    );
  }, [handleX, geometry.labelWidth, geometry.readoutWidth, geometry.width]);

  const labelBounds = { start: TEXT_INSET, end: TEXT_INSET + geometry.labelWidth };
  const readoutBounds = {
    start: geometry.width - TEXT_INSET - geometry.readoutWidth,
    end: geometry.width - TEXT_INSET,
  };
  const overlapsText = (x: number, bounds: { start: number; end: number }) =>
    x + 2 >= bounds.start && x - 2 <= bounds.end;
  const ticks = showTicks
    ? stops.map((stop) => stop.x).filter((x) => !overlapsText(x, labelBounds) && !overlapsText(x, readoutBounds))
    : [];

  const { value: scaleY } = useSpringValue(dragging ? 1.35 : 1, SPRING_BOUNCY, {
    enabled: !reduce,
  });

  const queueDragCommit = (value: number) => {
    pendingDragValue.current = value;
    if (dragFrame.current !== null) return;
    dragFrame.current = requestAnimationFrame(() => {
      dragFrame.current = null;
      if (pendingDragValue.current !== null) commit(pendingDragValue.current);
      pendingDragValue.current = null;
    });
  };

  const cancelDragCommit = () => {
    if (dragFrame.current !== null) cancelAnimationFrame(dragFrame.current);
    dragFrame.current = null;
    pendingDragValue.current = null;
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    // Clear before releasing capture: its lost-capture event must not commit twice.
    gesture.current = null;
    cancelDragCommit();
    setDragging(false);
    if (!options.disabled && geometry.width > 0) {
      const x =
        event.type === "pointerup" ? event.clientX - active.left - active.offset : active.x;
      const stop = nearestStop(stops, x);
      commit(stop.value);
      settleTo(options.value === undefined ? stop.x : restingX);
    } else {
      settleTo(restingX);
    }
    releasePointer(event.currentTarget, event.pointerId);
  };

  return (
    <div
      ref={trackProps.ref}
      onPointerDown={(event) => {
        if (options.disabled || event.button !== 0 || gesture.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (!rect.width) return;
        event.preventDefault();
        const pointerX = event.clientX - rect.left;
        const thumbX = handleXRef.current;
        // Grabbing the thumb preserves the exact grab point. A track click
        // waits for release, so it glides to a dot without an intermediate jump.
        const offset = Math.abs(pointerX - thumbX - 2) <= 12 ? pointerX - thumbX : 2;
        gesture.current = { id: event.pointerId, left: rect.left, offset, x: thumbX };
        setDragging(true);
        stopSpring();
        cancelDragCommit();
        capturePointer(event.currentTarget, event.pointerId);
        event.currentTarget
          .querySelector<HTMLButtonElement>("[role=slider]")
          ?.focus({ preventScroll: true });
      }}
      onPointerMove={(event) => {
        const active = gesture.current;
        if (!active || active.id !== event.pointerId || options.disabled) return;
        const x = Math.min(
          endX,
          Math.max(HANDLE_START, event.clientX - active.left - active.offset),
        );
        active.x = x;
        applyX(x);
        queueDragCommit(mapBetweenStops(stops, x, "x", "value"));
      }}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      className={cn(
        "relative h-10 w-full touch-none select-none overflow-hidden rounded-lg bg-muted",
        TOUCH_GESTURE_CLASS,
        options.disabled ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing",
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

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-foreground">
        <span
          ref={labelRef}
          className="absolute top-1/2 left-5 max-w-[40%] -translate-y-1/2 truncate text-sm leading-5 font-medium"
        >
          {label}
        </span>
        <span
          ref={readoutRef}
          className="absolute top-1/2 right-5 max-w-[40%] -translate-y-1/2 truncate text-[13px] leading-[18px] font-semibold tracking-tight tabular-nums"
        >
          {format(current)}
        </span>
        {ticks.map((left) => (
          <span
            key={left}
            className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-foreground/25"
            style={{ left }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-0 h-6 w-1 text-foreground"
        style={{ transform: `translateX(${handleX}px) scaleY(${scaleY})` }}
      >
        <span
          className="absolute top-0 size-1 rounded-full bg-current"
          style={{ transform: `translateY(${reduce ? 0 : -split}px)` }}
        />
        <span className="absolute inset-y-0 w-1 rounded-full bg-current" style={{ opacity: 1 - split }} />
        <span
          className="absolute bottom-0 size-1 rounded-full bg-current"
          style={{ transform: `translateY(${reduce ? 0 : split}px)` }}
        />
      </div>

      <button
        type="button"
        {...sliderProps}
        onKeyDown={(event) => {
          if (options.disabled) return;
          const next = {
            ArrowRight: stops.find((stop) => stop.value > current)?.value ?? max,
            ArrowUp: stops.find((stop) => stop.value > current)?.value ?? max,
            ArrowLeft: [...stops].reverse().find((stop) => stop.value < current)?.value ?? min,
            ArrowDown: [...stops].reverse().find((stop) => stop.value < current)?.value ?? min,
            Home: min,
            End: max,
            PageUp: max,
            PageDown: min,
          }[event.key];
          if (next !== undefined) {
            event.preventDefault();
            commit(next);
          }
        }}
        className="absolute inset-0 cursor-inherit touch-none rounded-lg border-0 outline-none"
      />
    </div>
  );
}
