export const SPRING_GLIDE = {
  stiffness: 520,
  damping: 32,
  mass: 1,
} as const;

export const SPRING_BOUNCY = {
  type: "spring",
  stiffness: 500,
  damping: 14,
  mass: 0.7,
} as const;
