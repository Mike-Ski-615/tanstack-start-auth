import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import { cn } from "#lib/utils";

export function SettingPage({
  title,
  desc,
  icon,
  children,
}: {
  title: string;
  desc: string;
  icon: IconSvgElement;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
      <header className="shrink-0 pb-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={icon} className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </header>

      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  labels,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={
            value === option
              ? "rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
              : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          }
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function PreviewBox({
  children,
  fill = false,
}: {
  children: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <div className={cn("mt-6 flex flex-col", fill && "min-h-0 flex-1")}>
      <div className="mb-3 shrink-0 text-xs font-medium text-muted-foreground">实时预览</div>
      {children}
    </div>
  );
}

/** 3×2 网格（小屏 6×1），格间 1px 分割线、无外框。 */
export function PreviewGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden bg-border/50 sm:grid-cols-3">
      {children}
    </div>
  );
}

export function PreviewCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-center bg-background p-4">{children}</div>
  );
}
