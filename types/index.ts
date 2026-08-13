export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface User { id: string; username: string; name: string; avatar: string; bio: string; neighborhood: string; followers: number; following: number; }
export interface RestaurantPhoto { id: string; url: string; alt: string; reviewId?: string; }
export interface Restaurant { id: string; slug: string; name: string; cuisine: string[]; tags: string[]; category: "restaurant" | "bar"; chef: string; occasions: string[]; isOpenNow: boolean; distanceKm: number; coordinates: { x: number; y: number; latitude: number; longitude: number }; priceRange: PriceRange; neighborhood: string; city: "Belo Horizonte" | "Nova Lima"; address: string; godinnerRating: number; friendsRating: number; reviewCount: number; coverPhoto: RestaurantPhoto; photos: RestaurantPhoto[]; }
export interface Review { id: string; userId: string; restaurantId: string; rating: number; comment: string; photos: RestaurantPhoto[]; amountPerPerson?: number; visitDate: string; createdAt: string; }
export interface RestaurantList { id: string; ownerId: string; name: string; description: string; isPublic: boolean; coverPhoto: string; restaurantIds: string[]; type?: "want" | "visited" | "favorites" | "custom"; }
export interface Follow { followerId: string; followingId: string; createdAt: string; }
