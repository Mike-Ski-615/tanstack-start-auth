import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "#lib/utils";

const CORNER = 6;
const DASH = "repeating-linear-gradient(to top, transparent 0 2px, currentColor 2px 4px)";

export type HookSidebarItem = string | { label: string; href?: string };

export type HookSidebarProps = Omit<ComponentProps<"nav">, "onChange"> & {
  items: HookSidebarItem[];
  label?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (index: number) => void;
  color?: string;
  dashed?: boolean;
};

const hrefOf = (item: HookSidebarItem) => (typeof item === "string" ? undefined : item.href);

const labelOf = (item: HookSidebarItem) => (typeof item === "string" ? item : item.label);

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

const Rail = ({
  from = 0,
  y,
  visible,
  reduced,
  color,
  dashed,
  className,
}: {
  from?: number;
  y: number | null;
  visible: boolean;
  reduced: boolean;
  color?: string;
  dashed: boolean;
  className?: string;
}) => {
  const travel = reduced
    ? "none"
    : "top 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <span
      aria-hidden
      style={{
        color,
        opacity: visible && y !== null ? 1 : 0,
        transition: reduced ? "none" : "opacity 200ms ease",
      }}
      className={cn("pointer-events-none absolute inset-0", className)}
    >
      <span
        style={{
          top: from,
          height: Math.max(0, (y ?? 0) - CORNER - from),
          transition: travel,
          ...(dashed ? { backgroundImage: DASH } : { backgroundColor: "currentColor" }),
        }}
        className="absolute start-0.5 w-px"
      />
      <svg
        width="12"
        height="7"
        viewBox="0 0 12 7"
        fill="none"
        style={{ top: (y ?? 0) - CORNER, transition: travel }}
        className="absolute start-0.5"
      >
        <path
          d="M0.5 0a6 6 0 0 0 6 6H12"
          stroke="currentColor"
          strokeDasharray={dashed ? "2 2" : undefined}
        />
      </svg>
    </span>
  );
};

export function HookSidebar({
  items,
  label,
  value,
  defaultValue = 0,
  onChange,
  color = "#FC4C01",
  dashed = true,
  className,
  ...props
}: HookSidebarProps) {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);

  const routed = items.some((item) => hrefOf(item));
  const routeIndex = items.findIndex((item) => hrefOf(item) === pathname);
  const activeIndex = value ?? (routed ? routeIndex : internalValue);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () =>
      setCenters(itemRefs.current.map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0)));

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length]);

  const activeY = activeIndex < 0 ? null : (centers[activeIndex] ?? null);
  const hoverY = hoverIndex === null ? null : (centers[hoverIndex] ?? null);

  const hoverFrom =
    activeY !== null && hoverY !== null && hoverY <= activeY
      ? Math.max(0, hoverY - CORNER)
      : (activeY ?? 0);

  const select = (index: number) => {
    if (value === undefined) setInternalValue(index);
    onChange?.(index);
  };

  return (
    <nav
      data-slot="hook-sidebar"
      aria-label={label}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {label && (
        <span
          data-slot="hook-sidebar-label"
          className="pb-3 ps-0.5 pe-2 font-sans text-base font-medium uppercase tracking-wide text-foreground"
        >
          {label}
        </span>
      )}

      <div
        ref={listRef}
        onMouseLeave={() => setPointerInside(false)}
        className="relative flex flex-col gap-0.5"
      >
        <Rail
          from={hoverFrom}
          y={hoverY}
          visible={(pointerInside || focusInside) && hoverIndex !== activeIndex}
          reduced={reduced}
          dashed={dashed}
          className="text-foreground/30"
        />
        <Rail
          y={activeY}
          visible={activeY !== null}
          reduced={reduced}
          color={color}
          dashed={dashed}
        />

        {items.map((item, index) => {
          const text = labelOf(item);
          const href = hrefOf(item);
          const isActive = index === activeIndex;
          const setRef = (el: HTMLElement | null) => {
            itemRefs.current[index] = el;
          };
          const rowProps = {
            "data-slot": "hook-sidebar-item",
            "data-active": isActive,
            onMouseEnter: () => {
              setHoverIndex(index);
              setPointerInside(true);
            },
            onFocus: () => {
              setHoverIndex(index);
              setFocusInside(true);
            },
            onBlur: () => setFocusInside(false),
            onClick: () => select(index),
            className: cn(
              "w-fit rounded-lg py-1.5 ps-5 pe-2 text-left text-sm transition-colors duration-200 motion-reduce:transition-none",
              isActive ? "text-foreground" : "text-foreground/50 hover:text-foreground/80",
            ),
          };

          return href ? (
            <Link
              key={`${index}-${text}`}
              {...rowProps}
              ref={setRef}
              to={href}
              aria-current={isActive ? "page" : undefined}
            >
              {text}
            </Link>
          ) : (
            <button
              key={`${index}-${text}`}
              {...rowProps}
              ref={setRef}
              type="button"
              aria-current={isActive ? "true" : undefined}
            >
              {text}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
