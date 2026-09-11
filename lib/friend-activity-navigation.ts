export type FriendActivityPosition = {
  reviewIndex: number;
  photoIndex: number;
};

/**
 * Defines the only allowed transition for the compact friend-activity
 * carousel. A gesture either changes a photo or a review, never both.
 */
export function moveFriendActivityPosition(
  current: FriendActivityPosition,
  photoCounts: number[],
  direction: -1 | 1,
): FriendActivityPosition {
  const reviewCount = photoCounts.length;
  if (!reviewCount) return current;

  const reviewIndex = Math.min(Math.max(current.reviewIndex, 0), reviewCount - 1);
  const photoCount = Math.max(photoCounts[reviewIndex] ?? 0, 0);
  const photoIndex = Math.min(Math.max(current.photoIndex, 0), Math.max(photoCount - 1, 0));

  if (direction === 1) {
    if (photoCount > 1 && photoIndex < photoCount - 1) return { reviewIndex, photoIndex: photoIndex + 1 };
    if (reviewIndex < reviewCount - 1) return { reviewIndex: reviewIndex + 1, photoIndex: 0 };
    return { reviewIndex, photoIndex };
  }

  if (photoCount > 1 && photoIndex > 0) return { reviewIndex, photoIndex: photoIndex - 1 };
  if (reviewIndex > 0) {
    const previousPhotoCount = Math.max(photoCounts[reviewIndex - 1] ?? 0, 0);
    return { reviewIndex: reviewIndex - 1, photoIndex: Math.max(previousPhotoCount - 1, 0) };
  }
  return { reviewIndex, photoIndex };
}
