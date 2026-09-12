import * as React from "react";

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
  const { value, defaultValue, min, max, step = 1, disabled, onValueChange } = options;
  const [uncontrolled, setUncontrolled] = React.useState(() =>
    snapSliderValue(defaultValue ?? min, min, max, step),
  );
  const current = snapSliderValue(value ?? uncontrolled, min, max, step);

  const commit = React.useCallback(
    (next: number) => {
      const snapped = snapSliderValue(next, min, max, step);
      if (value === undefined) setUncontrolled(snapped);
      onValueChange?.(snapped);
    },
    [min, max, step, value, onValueChange],
  );

  const trackRef = React.useRef<HTMLDivElement>(null);

  return {
    current,
    min,
    max,
    step,
    disabled: !!disabled,
    commit,
    trackProps: { ref: trackRef },
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
