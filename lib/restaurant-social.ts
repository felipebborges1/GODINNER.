import type { Follow, Review } from "@/types";

export function getFriendIds(follows: Follow[], currentUserId: string) {
  return new Set(follows.filter((follow) => follow.followerId === currentUserId).map((follow) => follow.followingId));
}

export function countFriendsWhoVisited(reviews: Review[], restaurantId: string, friendIds: Set<string>) {
  return new Set(reviews.filter((review) => review.restaurantId === restaurantId && friendIds.has(review.userId)).map((review) => review.userId)).size;
}
