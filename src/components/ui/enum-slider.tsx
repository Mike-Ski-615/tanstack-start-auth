import { InlineSlider } from "#components/ui/inline-slider";

type EnumSliderProps<T extends string> = {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format: (value: T) => string;
  disabled?: boolean;
  className?: string;
};

export function EnumSlider<T extends string>({
  label,
  values,
  value,
  onChange,
  format,
  disabled,
  className,
}: EnumSliderProps<T>) {
  const index = Math.max(0, values.indexOf(value));

  return (
    <InlineSlider
      label={label}
      min={0}
      max={values.length - 1}
      step={1}
      value={index}
      disabled={disabled}
      className={className}
      onValueChange={(next) => {
        const picked = values[Math.round(next)];
        if (picked !== undefined && picked !== value) onChange(picked);
      }}
      format={(next) => {
        const picked = values[Math.round(next)];
        return picked === undefined ? format(value) : format(picked);
      }}
      formatValueText={(next) => {
        const picked = values[Math.round(next)];
        return picked === undefined ? format(value) : format(picked);
      }}
    />
  );
}
