export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface User { id: string; username: string; name: string; avatar: string | null; avatarPath?: string | null; bio: string; neighborhood: string; followers: number; following: number; role?: "user" | "admin"; }
export interface RestaurantPhoto { id: string; url: string; alt: string; reviewId?: string; file?: File; }
export interface RestaurantCoordinates { latitude: number; longitude: number; }
export interface Restaurant { id: string; slug: string; name: string; cuisine: string[]; tags: string[]; category: "restaurant" | "bar"; chef: string; occasions: string[]; isOpenNow: boolean; distanceKm: number; coordinates?: RestaurantCoordinates; priceRange: PriceRange; neighborhood: string; city: "Belo Horizonte" | "Nova Lima"; address: string; godinnerRating: number; friendsRating: number; reviewCount: number; coverPhoto: RestaurantPhoto; photos: RestaurantPhoto[]; hasGooglePlaceCover?: boolean; status?: "published" | "pending_review" | "rejected"; submittedBy?: string; submittedAt?: string; instagram?: string; site?: string; phone?: string; moderatedBy?: string; moderatedAt?: string; rejectionReason?: string; mergedIntoId?: string; }
export interface ReviewSocialSummary { likeCount: number; commentCount: number; likedByMe: boolean; }
export interface ReviewComment { id: string; reviewId: string; userId: string; body: string; createdAt: string; updatedAt: string; }
export interface Review { id: string; userId: string; restaurantId: string; rating: number; comment: string; photos: RestaurantPhoto[]; amountPerPerson?: number; visitDate: string; createdAt: string; }
export interface RestaurantList { id: string; ownerId: string; name: string; description: string; isPublic: boolean; coverPhoto: string; restaurantIds: string[]; type?: "want" | "visited" | "favorites" | "custom"; }
export interface Follow { followerId: string; followingId: string; createdAt: string; }
