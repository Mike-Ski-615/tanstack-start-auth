import * as React from "react";
import { cn } from "#lib/utils";

const TRACK_HEIGHT = 40;
const HANDLE_START = 8;
const HANDLE_END_INSET = 12;
const TEXT_INSET = 20;
const GRAB_RADIUS = 12;
const SPLIT_DISTANCE = 6;

type InlineSliderProps<T> = {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  disabled?: boolean;
  className?: string;
};

export function InlineSlider<T>({
  label,
  values,
  value,
  onChange,
  format,
  disabled,
  className,
}: InlineSliderProps<T>) {
  const index = Math.max(0, values.indexOf(value));
  const lastIndex = values.length - 1;

  const trackRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const readoutRef = React.useRef<HTMLSpanElement>(null);

  const [geometry, setGeometry] = React.useState({ width: 292, labelWidth: 22, readoutWidth: 24 });
  const [dragging, setDragging] = React.useState(false);
  const [dragX, setDragX] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => {
      const width = track.getBoundingClientRect().width;
      if (!width) return;
      setGeometry((prev) => {
        const next = {
          width,
          labelWidth: labelRef.current?.getBoundingClientRect().width ?? prev.labelWidth,
          readoutWidth: readoutRef.current?.getBoundingClientRect().width ?? prev.readoutWidth,
        };
        return prev.width === next.width &&
          prev.labelWidth === next.labelWidth &&
          prev.readoutWidth === next.readoutWidth
          ? prev
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    if (labelRef.current) observer.observe(labelRef.current);
    if (readoutRef.current) observer.observe(readoutRef.current);
    return () => observer.disconnect();
  }, []);

  const endX = Math.max(HANDLE_START, geometry.width - HANDLE_END_INSET);
  const stops = React.useMemo(
    () =>
      values.map((_, i) => ({
        index: i,
        x: lastIndex === 0 ? HANDLE_START : HANDLE_START + (i / lastIndex) * (endX - HANDLE_START),
      })),
    [values, lastIndex, endX],
  );
  const restingX = stops[index]?.x ?? HANDLE_START;
  const handleX = dragX ?? restingX;

  // 拖动中直接跟手（无过渡），松手后由 CSS 弹簧回位。
  const transition = dragging ? "none" : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  const gesture = React.useRef<{
    id: number;
    left: number;
    offset: number;
    pointerX: number;
    moved: boolean;
  } | null>(null);

  const snapTo = (x: number) => {
    let best = stops[0]!;
    for (const stop of stops) {
      if (Math.abs(stop.x - x) < Math.abs(best.x - x)) best = stop;
    }
    return best;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    event.preventDefault();
    const pointerX = event.clientX - rect.left;
    const thumbX = handleX;
    const offset = Math.abs(pointerX - thumbX - 2) <= GRAB_RADIUS ? pointerX - thumbX : 2;
    gesture.current = { id: event.pointerId, left: rect.left, offset, pointerX, moved: false };
    setDragging(true);
    setDragX(thumbX);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.querySelector<HTMLButtonElement>("[role=slider]")?.focus({ preventScroll: true });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || disabled) return;
    active.pointerX = event.clientX - active.left;
    active.moved = true;
    const x = Math.min(endX, Math.max(HANDLE_START, event.clientX - active.left - active.offset));
    setDragX(x);
    const stop = snapTo(x);
    if (stop.index !== index) onChange(values[stop.index]!);
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (!disabled) {
      // 未移动过 = 单击轨道 → 吸附到点击位置；拖动过 → 保持已落位的那一档。
      const x = active.moved
        ? handleX
        : Math.min(endX, Math.max(HANDLE_START, active.pointerX - 2));
      const stop = snapTo(x);
      if (stop.index !== index) onChange(values[stop.index]!);
      setDragX(null);
    } else {
      setDragX(null);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const fillRight = handleX >= endX ? geometry.width - 2 : handleX + 8;
  const fillX = fillRight - geometry.width + 2;

  const overlap = (start: number, end: number) =>
    Math.max(0, Math.min(1, (handleX + 4 - start) / SPLIT_DISTANCE, (end - handleX) / SPLIT_DISTANCE));
  const split = Math.max(
    overlap(TEXT_INSET, TEXT_INSET + geometry.labelWidth),
    overlap(
      geometry.width - TEXT_INSET - geometry.readoutWidth,
      geometry.width - TEXT_INSET,
    ),
  );

  const SPLIT_TRANSITION = "transform 200ms ease-out, opacity 200ms ease-out";

  const overlapsText = (x: number, start: number, end: number) => x + 2 >= start && x - 2 <= end;
  const labelBounds = { start: TEXT_INSET, end: TEXT_INSET + geometry.labelWidth };
  const readoutBounds = {
    start: geometry.width - TEXT_INSET - geometry.readoutWidth,
    end: geometry.width - TEXT_INSET,
  };
  const ticks = stops
    .map((stop) => stop.x)
    .filter(
      (x) =>
        !overlapsText(x, labelBounds.start, labelBounds.end) &&
        !overlapsText(x, readoutBounds.start, readoutBounds.end),
    );

  const keyTargets: Record<string, number | undefined> = {
    ArrowRight: stops.find((s) => s.index > index)?.index ?? lastIndex,
    ArrowUp: stops.find((s) => s.index > index)?.index ?? lastIndex,
    ArrowLeft: stops.findLast((s) => s.index < index)?.index ?? 0,
    ArrowDown: stops.findLast((s) => s.index < index)?.index ?? 0,
    Home: 0,
    End: lastIndex,
    PageUp: lastIndex,
    PageDown: 0,
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onLostPointerCapture={endGesture}
      className={cn(
        "relative w-full touch-none overflow-hidden rounded-lg bg-muted select-none",
        disabled ? "pointer-events-none opacity-50" : "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ height: TRACK_HEIGHT }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[2px] inset-y-0 overflow-hidden rounded-lg"
      >
        <div
          className="absolute inset-0 rounded-lg bg-foreground/15"
          style={{ transform: `translateX(${fillX}px)`, transition }}
        />
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
          {format(value)}
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
        style={{ transform: `translateX(${handleX}px) scaleY(${dragging ? 1.35 : 1})`, transition }}
      >
        <span
          className="absolute top-0 size-1 rounded-full bg-current"
          style={{ transform: `translateY(${-split}px)`, transition: SPLIT_TRANSITION }}
        />
        <span
          className="absolute inset-y-0 w-1 rounded-full bg-current"
          style={{ opacity: 1 - split, transition: SPLIT_TRANSITION }}
        />
        <span
          className="absolute bottom-0 size-1 rounded-full bg-current"
          style={{ transform: `translateY(${split}px)`, transition: SPLIT_TRANSITION }}
        />
      </div>

      <button
        type="button"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={index}
        aria-valuetext={format(value)}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled) return;
          const next = keyTargets[event.key];
          if (next !== undefined) {
            event.preventDefault();
            onChange(values[next]!);
          }
        }}
        className="absolute inset-0 touch-none rounded-lg border-0 outline-none"
      />
    </div>
  );
}
