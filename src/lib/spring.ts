const REST_DISPLACEMENT = 0.01;
const REST_VELOCITY = 0.01;

export type SpringConfig = {
  type: "spring";
  stiffness: number;
  damping: number;
  mass?: number;
};

type Solution = {
  at: (t: number) => { value: number; velocity: number };
  duration: number;
};

/**
 * 弹簧解析解, 与 motion 的 spring 求解器同源 (framer-motion/src/animation/generators/spring.ts)。
 * 用解析解而非数值积分: 对欠阻尼弹簧 (BOUNCY) 欧拉积分会明显偏离原曲线。
 */
export function createSpringSolution(
  { stiffness, damping, mass = 1 }: SpringConfig,
  from: number,
  to: number,
  initialVelocity = 0,
): Solution {
  const delta = to - from;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(Math.abs(1 - zeta * zeta));
  const v0 = -initialVelocity / 1000;

  // 静止判定: 位移与速度都低于阈值时视为完成。
  const isDisplacement = (t: number) => {
    if (zeta < 1) {
      const envelope = Math.exp(-zeta * w0 * t);
      return Math.abs(delta * envelope) <= REST_DISPLACEMENT;
    }
    const envelope = Math.exp(-w0 * t) * (1 + w0 * t);
    return Math.abs(delta * envelope) <= REST_DISPLACEMENT;
  };

  const at = (t: number) => {
    if (zeta < 1) {
      const envelope = Math.exp(-zeta * w0 * t);
      const cos = Math.cos(wd * t);
      const sin = Math.sin(wd * t);
      const value = to - envelope * (delta * cos + ((zeta * w0 * delta + v0) / wd) * sin);
      const velocity =
        envelope *
        (delta * zeta * w0 * cos +
          ((zeta * w0 * delta + v0) / wd) * zeta * w0 * sin -
          delta * wd * sin +
          ((zeta * w0 * delta + v0) / wd) * wd * cos);
      return { value, velocity };
    }
    if (zeta === 1) {
      const envelope = Math.exp(-w0 * t);
      const value = to - envelope * (delta + (v0 + w0 * delta) * t);
      const velocity = envelope * (v0 * (1 - w0 * t) + w0 * w0 * delta * t);
      return { value, velocity };
    }
    const envelope = Math.exp(-zeta * w0 * t);
    const cosh = Math.cosh(wd * t);
    const sinh = Math.sinh(wd * t);
    const value = to - envelope * (delta * cosh + ((zeta * w0 * delta + v0) / wd) * sinh);
    const velocity =
      envelope *
      (delta * zeta * w0 * cosh +
        ((zeta * w0 * delta + v0) / wd) * zeta * w0 * sinh -
        delta * wd * sinh -
        ((zeta * w0 * delta + v0) / wd) * wd * cosh);
    return { value, velocity };
  };

  // 找到满足静止条件的最早时间, 作为本次动画的时长。
  let duration = 0;
  const step = 1 / 1000;
  for (let t = 0; t < 30; t += step) {
    const { value, velocity } = at(t);
    const displaced = Math.abs(value - to) > REST_DISPLACEMENT;
    const moving = Math.abs(velocity) > REST_VELOCITY;
    if (!displaced && !moving) {
      duration = t;
      break;
    }
    duration = t;
  }
  if (!isDisplacement(duration)) duration += step;

  return { at, duration };
}
