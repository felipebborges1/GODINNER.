export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface User { id: string; username: string; name: string; avatar: string | null; avatarPath?: string | null; bio: string; neighborhood: string; followers: number; following: number; role?: "user" | "admin"; }
export interface RestaurantPhoto { id: string; url: string; alt: string; reviewId?: string; storagePath?: string; position?: number; file?: File; }
export interface RestaurantCoordinates { latitude: number; longitude: number; }
export interface Restaurant { id: string; slug: string; name: string; cuisine: string[]; tags: string[]; category: "restaurant" | "bar"; chef: string; occasions: string[]; isOpenNow: boolean; distanceKm: number; coordinates?: RestaurantCoordinates; priceRange: PriceRange; neighborhood: string; city: string; address: string; countryCode?: string; godinnerRating: number; friendsRating: number; reviewCount: number; coverPhoto: RestaurantPhoto; photos: RestaurantPhoto[]; hasGooglePlaceCover?: boolean; googlePlaceId?: string; status?: "published" | "pending_review" | "rejected"; submittedBy?: string; submittedAt?: string; instagram?: string; site?: string; phone?: string; moderatedBy?: string; moderatedAt?: string; rejectionReason?: string; mergedIntoId?: string; }
export interface ReviewSocialSummary { likeCount: number; commentCount: number; likedByMe: boolean; }
export interface ReviewLikeUser { userId: string; username: string; name: string; avatar: string | null; likedAt: string; }
export interface CommentMention { commentId: string; userId: string; username: string; }
export interface ReviewComment { id: string; reviewId: string; userId: string; body: string; createdAt: string; updatedAt: string; parentCommentId: string | null; replyToCommentId: string | null; mentions: CommentMention[]; }
export type NotificationType = "follow" | "review_like" | "review_comment" | "comment_mention" | "comment_reply";
export interface InAppNotification { id: string; recipientUserId: string; actorUserId: string; type: NotificationType; reviewId: string | null; restaurantId: string | null; commentId: string | null; createdAt: string; readAt: string | null; }
export type ReviewRatingMethod = "legacy" | "dimensions";
export interface Review { id: string; userId: string; restaurantId: string; rating: number; ratingMethod: ReviewRatingMethod; foodRating: number | null; serviceRating: number | null; ambienceRating: number | null; comment: string; photos: RestaurantPhoto[]; amountPerPerson?: number; currency?: string; visitDate: string; createdAt: string; updatedAt?: string; }
export type ReviewDraft = Pick<Review, "restaurantId" | "comment" | "photos" | "amountPerPerson" | "visitDate" | "foodRating" | "serviceRating" | "ambienceRating"> & { publicationKey?: string };
export type ReviewUpdateDraft = Pick<Review, "comment" | "photos" | "amountPerPerson" | "visitDate">;
export interface RestaurantList { id: string; ownerId: string; name: string; description: string; isPublic: boolean; coverPhoto: string; restaurantIds: string[]; type?: "want" | "visited" | "favorites" | "custom"; }
export interface Follow { followerId: string; followingId: string; createdAt: string; }
