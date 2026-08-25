import type { Follow, Restaurant, RestaurantList, RestaurantPhoto, Review, User } from "@/types";
import type { FollowRow, ListRow, ProfileRow, RestaurantRow, ReviewPhotoRow, ReviewRow } from "./database.types";
import { distanceKm, FALLBACK_COORDINATES, hasCoordinates } from "@/lib/distance";

const placeholderImage = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";

export function mapProfile(row: ProfileRow, avatarUrl: string | null = row.avatar_url) {
  const avatarPath = row.avatar_url?.startsWith(`${row.id}/`) ? row.avatar_url : null;
  return { id: row.id, username: row.username, name: row.name, avatar: avatarUrl, avatarPath, bio: row.bio, neighborhood: row.location, followers: 0, following: 0, role: row.role } satisfies User;
}
export function mapRestaurant(row: RestaurantRow): Restaurant {
  const coordinates = hasCoordinates({ latitude: row.latitude, longitude: row.longitude })
    ? { latitude: row.latitude, longitude: row.longitude }
    : undefined;
  return { id: row.id, slug: row.slug, name: row.name, cuisine: row.cuisines, tags: [], category: row.category, chef: row.chef, occasions: [], isOpenNow: false, distanceKm: coordinates ? distanceKm(FALLBACK_COORDINATES, coordinates) : Number.POSITIVE_INFINITY, coordinates, priceRange: row.price_range, neighborhood: row.neighborhood, city: row.city === "Nova Lima" ? "Nova Lima" : "Belo Horizonte", address: row.address, godinnerRating: 0, friendsRating: 0, reviewCount: 0, coverPhoto: { id: `${row.id}-cover`, url: row.cover_photo_url ?? placeholderImage, alt: row.name }, photos: [], hasGooglePlaceCover: Boolean(row.google_place_id), status: row.status, submittedBy: row.submitted_by ?? undefined, submittedAt: row.submitted_at ?? undefined, moderatedBy: row.moderated_by ?? undefined, moderatedAt: row.moderated_at ?? undefined, rejectionReason: row.rejection_reason ?? undefined, mergedIntoId: row.merged_into_id ?? undefined, instagram: row.instagram ?? undefined, site: row.website ?? undefined, phone: row.phone ?? undefined };
}
export function mapReview(row: ReviewRow, photos: RestaurantPhoto[] = []): Review { const legacyRating = row.rating === null ? null : Number(row.rating); const foodRating = row.food_rating; const serviceRating = row.service_rating; const ambienceRating = row.ambience_rating; const rating = row.rating_method === "dimensions" ? ((foodRating ?? 0) + (serviceRating ?? 0) + (ambienceRating ?? 0)) / 3 : (legacyRating ?? 0) / 2; return { id: row.id, userId: row.user_id, restaurantId: row.restaurant_id, rating, legacyRating, ratingMethod: row.rating_method, foodRating, serviceRating, ambienceRating, comment: row.comment, photos, amountPerPerson: row.amount_per_person ?? undefined, visitDate: row.visit_date, createdAt: row.created_at }; }
export function mapReviewPhoto(row: ReviewPhotoRow, url: string): RestaurantPhoto { return { id: row.id, reviewId: row.review_id, url, alt: "Foto da experiência" }; }
export function mapList(row: ListRow, restaurantIds: string[]): RestaurantList { return { id: row.id, ownerId: row.owner_id, name: row.name, description: row.description, isPublic: row.is_public, coverPhoto: row.cover_photo_url ?? placeholderImage, restaurantIds, type: row.type }; }
export function mapFollow(row: FollowRow): Follow { return { followerId: row.follower_id, followingId: row.following_id, createdAt: row.created_at }; }
