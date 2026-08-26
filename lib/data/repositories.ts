import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { toDataError, type DataError } from "./errors";

type Client = SupabaseClient<Database>;
export type RepositoryResult<T> = { data: T | null; error: DataError | null };
export const REVIEW_LIKES_PAGE_SIZE = 20;

function result<T>(data: T | null, error: unknown = null): RepositoryResult<T> {
  return error ? { data: null, error: toDataError(error) } : { data, error: null };
}

export async function listPublishedRestaurants(client: Client, options?: { city?: string; neighborhood?: string }) {
  let query = client.from("restaurants").select("*").eq("status", "published").order("created_at", { ascending: false });
  if (options?.city) query = query.eq("city", options.city);
  if (options?.neighborhood) query = query.eq("neighborhood", options.neighborhood);
  const response = await query;
  return result(response.data, response.error);
}

export async function getRestaurantBySlug(client: Client, slug: string) {
  const response = await client.from("restaurants").select("*").eq("slug", slug).maybeSingle();
  return result(response.data, response.error);
}

export async function listRestaurantReviews(client: Client, restaurantId: string) {
  const response = await client.from("reviews").select("*").eq("restaurant_id", restaurantId).order("created_at", { ascending: false });
  return result(response.data, response.error);
}

export async function listUserLists(client: Client, ownerId: string) {
  const response = await client.from("restaurant_lists").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true });
  return result(response.data, response.error);
}

export async function listFeedReviews(client: Client, userIds: string[]) {
  if (!userIds.length) return result([]);
  const response = await client.from("reviews").select("*").in("user_id", userIds).order("created_at", { ascending: false });
  return result(response.data, response.error);
}

export async function createFollow(client: Client, followerId: string, followingId: string) {
  if (followerId === followingId) return result(null, new Error("Você não pode seguir a si mesmo."));
  const response = await client.from("follows").insert({ follower_id: followerId, following_id: followingId }).select().single();
  return result(response.data, response.error);
}

export async function removeFollow(client: Client, followerId: string, followingId: string) {
  const response = await client.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
  return result(response.error ? null : true, response.error);
}

export async function publishReviewPersisted(client: Client, input: { restaurantId: string; foodRating: number; serviceRating: number; ambienceRating: number; comment: string; amountPerPerson?: number; visitDate: string; photos: Array<{ storagePath: string; position: number }> }) {
  const response = await client.rpc("publish_review_dimensions", {
    p_restaurant_id: input.restaurantId,
    p_food_rating: input.foodRating,
    p_service_rating: input.serviceRating,
    p_ambience_rating: input.ambienceRating,
    p_comment: input.comment,
    p_amount_per_person: input.amountPerPerson ?? null,
    p_visit_date: input.visitDate,
    p_photos: input.photos.map((photo) => ({ storage_path: photo.storagePath, position: photo.position })),
  });
  return result(response.data, response.error);
}

export async function listReviewLikes(client: Client, reviewId: string, offset = 0) {
  const response = await client
    .from("review_likes")
    .select("user_id, created_at")
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false })
    .range(offset, offset + REVIEW_LIKES_PAGE_SIZE);
  return result(response.data, response.error);
}

type ReviewUpdateMutationInput = { comment: string; amountPerPerson?: number; visitDate: string; photos: Array<{ storagePath: string; position: number }> };

export async function updateReviewPersisted(client: Client, reviewId: string, input: ReviewUpdateMutationInput) {
  const response = await client.rpc("update_review_owned", {
    p_review_id: reviewId,
    p_comment: input.comment,
    p_amount_per_person: input.amountPerPerson ?? null,
    p_visit_date: input.visitDate,
    p_photos: input.photos.map((photo) => ({ storage_path: photo.storagePath, position: photo.position })),
  });
  return result(response.data?.[0] ?? null, response.error);
}

export async function deleteReviewPersisted(client: Client, reviewId: string) {
  const response = await client.rpc("delete_review_owned", { p_review_id: reviewId });
  return result(response.data?.[0] ?? null, response.error);
}

export async function mergeRestaurantPersisted(client: Client, pendingId: string, targetId: string) {
  const response = await client.rpc("merge_restaurant", { p_pending_id: pendingId, p_target_id: targetId });
  return result(response.data, response.error);
}
