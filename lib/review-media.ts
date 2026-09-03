import type { RestaurantPhoto } from "@/types";
import { getHorizontalSwipeDirection } from "@/lib/gestures";

/**
 * Keep the upload sequence stable. The simple ordering is intentional for the
 * Beta and makes it possible to change the media strategy later in one place.
 */
export function orderReviewPhotos(photos: RestaurantPhoto[]) {
  return photos
    .map((photo, index) => ({ photo, index }))
    .sort((left, right) => (left.photo.position ?? left.index) - (right.photo.position ?? right.index))
    .map(({ photo }) => photo);
}

export function moveReviewPhotoIndex(index: number, photoCount: number, direction: -1 | 1) {
  if (photoCount <= 1) return 0;
  return Math.min(Math.max(index + direction, 0), photoCount - 1);
}

/**
 * Keeps the page scroll untouched unless a deliberate horizontal gesture was
 * made inside a review gallery. The gallery intentionally does not loop.
 */
export function getReviewPhotoSwipeDirection(startX: number, startY: number, endX: number, endY: number): -1 | 1 | null {
  return getHorizontalSwipeDirection(startX, startY, endX, endY);
}
