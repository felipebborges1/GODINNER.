export const GESTURE_INTENT_THRESHOLD_PX = 8;
export const HORIZONTAL_SWIPE_THRESHOLD_PX = 40;

export type GestureIntent = "horizontal" | "vertical" | null;

/**
 * Keeps gesture arbitration in one place. Vertical wins ties deliberately so
 * a page scroll never feels captured by a horizontal surface on mobile.
 */
export function getGestureIntent(deltaX: number, deltaY: number, threshold = GESTURE_INTENT_THRESHOLD_PX): GestureIntent {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);

  if (Math.max(horizontalDistance, verticalDistance) < threshold) return null;
  return verticalDistance >= horizontalDistance ? "vertical" : "horizontal";
}

export function getHorizontalSwipeDirection(startX: number, startY: number, endX: number, endY: number): -1 | 1 | null {
  const deltaX = endX - startX;
  const deltaY = endY - startY;

  if (Math.abs(deltaX) < HORIZONTAL_SWIPE_THRESHOLD_PX || getGestureIntent(deltaX, deltaY) !== "horizontal") return null;
  return deltaX < 0 ? 1 : -1;
}
