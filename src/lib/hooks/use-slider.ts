import * as React from "react";

// The 4px handle travels from 8px inside the left edge to 12px inside the
// right edge, so it never clips against the rounded track at either end.
export const HANDLE_START = 8;
export const HANDLE_END_INSET = 12;

export type SliderOptions = {
  value?: number;
  defaultValue?: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  "aria-label"?: string;
  formatValueText?: (value: number) => string;
};

export function snapSliderValue(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value));
  if (step <= 0) return clamped;
  const snapped = Math.round((clamped - min) / step) * step + min;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
}

export function useSlider(options: SliderOptions) {
  const { value, defaultValue, min, max, step = 1, disabled } = options;
  const onValueChange = options.onValueChange;

  const [uncontrolled, setUncontrolled] = React.useState(() =>
    snapSliderValue(defaultValue ?? min, min, max, step),
  );
  const [dragging, setDragging] = React.useState(false);
  const current = snapSliderValue(value ?? uncontrolled, min, max, step);

  const commit = React.useCallback(
    (next: number) => {
      const snapped = snapSliderValue(next, min, max, step);
      if (value === undefined) setUncontrolled(snapped);
      onValueChange?.(snapped);
    },
    [min, max, step, value, onValueChange],
  );

  const span = max - min || 1;
  const percent = Math.min(100, Math.max(0, ((current - min) / span) * 100));

  const trackRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  const valueFromClientX = React.useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || !rect.width) return undefined;
      // Map the pointer along the same inset path the thumb is rendered on,
      // otherwise a drag renders the handle up to HANDLE_END_INSET behind the
      // pointer instead of under it.
      const travel = rect.width - HANDLE_START - HANDLE_END_INSET;
      const ratio =
        travel > 0 ? Math.min(1, Math.max(0, (clientX - rect.left - HANDLE_START) / travel)) : 0;
      return snapSliderValue(min + ratio * span, min, max, step);
    },
    [min, max, step, span],
  );

  // RangeSlider 的拖拽由 hook 提供, InlineSlider 自己接管 pointer 事件。
  const trackProps = {
    ref: trackRef,
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0) return;
      const next = valueFromClientX(event.clientX);
      if (next === undefined) return;
      event.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      commit(next);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || disabled) return;
      const next = valueFromClientX(event.clientX);
      if (next !== undefined && next !== current) commit(next);
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {}
    },
    onPointerCancel: () => {
      draggingRef.current = false;
      setDragging(false);
    },
    onLostPointerCapture: () => {
      draggingRef.current = false;
      setDragging(false);
    },
  };

  return {
    current,
    percent,
    dragging,
    min,
    max,
    step,
    disabled: !!disabled,
    commit,
    trackProps,
    sliderProps: {
      role: "slider" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-label": options["aria-label"],
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": current,
      "aria-valuetext": options.formatValueText?.(current),
      "aria-disabled": disabled || undefined,
    },
  };
}
