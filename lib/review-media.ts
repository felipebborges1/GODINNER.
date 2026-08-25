import type { RestaurantPhoto } from "@/types";

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
  return (index + direction + photoCount) % photoCount;
}
