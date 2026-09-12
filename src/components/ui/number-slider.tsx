import * as React from "react";
import { cn } from "#lib/utils";

const TRACK_HEIGHT = 40;
const HANDLE_START = 8;
const HANDLE_END_INSET = 12;
const TEXT_INSET = 20;
const GRAB_RADIUS = 12;

type NumberSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
  className?: string;
};

export function NumberSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  format = String,
  disabled,
  className,
}: NumberSliderProps) {
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

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const snap = (n: number) => Math.round(clamp(n) / step) * step;
  const span = max - min || 1;
  const endX = Math.max(HANDLE_START, geometry.width - HANDLE_END_INSET);
  const xFor = (n: number) => HANDLE_START + ((clamp(n) - min) / span) * (endX - HANDLE_START);
  const valueFor = (x: number) =>
    snap(min + ((Math.min(endX, Math.max(HANDLE_START, x)) - HANDLE_START) / (endX - HANDLE_START)) * span);

  // 刻度: 5 等分位置
  const ticks = React.useMemo(
    () => Array.from({ length: 5 }, (_, i) => HANDLE_START + ((i + 1) / 6) * (endX - HANDLE_START)),
    [endX],
  );

  const restingX = xFor(value);
  const handleX = dragX ?? restingX;
  const transition = dragging ? "none" : "transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)";

  const gesture = React.useRef<{
    id: number;
    left: number;
    offset: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0 || gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    event.preventDefault();
    const pointerX = event.clientX - rect.left;
    const offset = Math.abs(pointerX - restingX - 2) <= GRAB_RADIUS ? pointerX - restingX : 2;
    gesture.current = { id: event.pointerId, left: rect.left, offset, moved: false };
    setDragging(true);
    setDragX(restingX);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget
      .querySelector<HTMLButtonElement>("[role=slider]")
      ?.focus({ preventScroll: true });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || disabled) return;
    active.moved = true;
    const x = event.clientX - active.left - active.offset;
    setDragX(x);
    const next = valueFor(x);
    if (next !== value) onChange(next);
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = null;
    setDragging(false);
    if (!disabled) {
      const final = active.moved ? valueFor(handleX) : snap(min + ((event.clientX - active.left - 2 - HANDLE_START) / (endX - HANDLE_START)) * span);
      if (final !== value) onChange(final);
      onCommit?.(final);
    }
    setDragX(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const fillRight = handleX >= endX ? geometry.width - 2 : handleX + 8;
  const fillX = fillRight - geometry.width + 2;

  const overlap = (start: number, end: number) =>
    Math.max(0, Math.min(1, (handleX + 4 - start) / 6, (end - handleX) / 6));
  const split = Math.max(
    overlap(TEXT_INSET, TEXT_INSET + geometry.labelWidth),
    overlap(geometry.width - TEXT_INSET - geometry.readoutWidth, geometry.width - TEXT_INSET),
  );
  const SPLIT_TRANSITION = "transform 200ms ease-out, opacity 200ms ease-out";

  const keyTargets: Record<string, number | undefined> = {
    ArrowRight: snap(value + step) === value ? clamp(value + step * 2) : clamp(value + step),
    ArrowUp: clamp(value + step),
    ArrowLeft: clamp(value - step),
    ArrowDown: clamp(value - step),
    Home: min,
    End: max,
    PageUp: clamp(value + step * 5),
    PageDown: clamp(value - step * 5),
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
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled) return;
          const next = keyTargets[event.key];
          if (next !== undefined) {
            event.preventDefault();
            onChange(next);
            onCommit?.(next);
          }
        }}
        className="absolute inset-0 touch-none rounded-lg border-0 outline-none"
      />
    </div>
  );
}
