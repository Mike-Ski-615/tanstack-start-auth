export const TOUCH_GESTURE_CLASS = "touch-none";

export function capturePointer(element: Element, pointerId: number) {
  if ("setPointerCapture" in element) {
    try {
      (element as HTMLElement).setPointerCapture(pointerId);
    } catch {}
  }
}

export function releasePointer(element: Element, pointerId: number) {
  if ("releasePointerCapture" in element) {
    try {
      const el = element as HTMLElement;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
    } catch {}
  }
}
