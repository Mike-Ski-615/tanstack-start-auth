import * as React from "react";

import { createSpringSolution, type SpringConfig } from "#lib/spring";

/**
 * 弹簧驱动, 与 motion 的 animate(motionValue, target, {type:"spring"}) 等价。
 * 按经过时间求解析解, 不做数值积分。
 */
export function useSpringValue(
  target: number,
  config: SpringConfig,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [value, setValue] = React.useState(target);
  const valueRef = React.useRef(target);
  const frameRef = React.useRef<number | null>(null);
  const targetRef = React.useRef(target);
  targetRef.current = target;
  const configRef = React.useRef(config);
  configRef.current = config;

  const stop = React.useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!enabled) {
      stop();
      valueRef.current = target;
      setValue(target);
      return;
    }
    const from = valueRef.current;
    if (from === target) return;

    const solution = createSpringSolution(configRef.current, from, target);
    const start = performance.now();
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const elapsed = (now - start) / 1000;
      if (elapsed >= solution.duration) {
        valueRef.current = target;
        setValue(target);
        frameRef.current = null;
        return;
      }
      const next = solution.at(elapsed).value;
      valueRef.current = next;
      setValue(next);
      frameRef.current = requestAnimationFrame(tick);
    };

    stop();
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      stop();
    };
  }, [target, enabled, stop]);

  React.useEffect(() => stop, [stop]);

  return { value, valueRef };
}
