export type AppRole = "user" | "admin";
export type RestaurantCategory = "restaurant" | "bar";
export type RestaurantStatus = "published" | "pending_review" | "rejected";
export type ListType = "want" | "visited" | "favorites" | "custom";
export type PriceRange = "$" | "$$" | "$$$" | "$$$$";

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] };
      restaurants: { Row: RestaurantRow; Insert: RestaurantInsert; Update: RestaurantUpdate; Relationships: [] };
      reviews: { Row: ReviewRow; Insert: ReviewInsert; Update: ReviewUpdate; Relationships: [] };
      review_photos: { Row: ReviewPhotoRow; Insert: ReviewPhotoInsert; Update: ReviewPhotoUpdate; Relationships: [] };
      review_likes: { Row: ReviewLikeRow; Insert: ReviewLikeInsert; Update: ReviewLikeUpdate; Relationships: [] };
      review_comments: { Row: ReviewCommentRow; Insert: ReviewCommentInsert; Update: ReviewCommentUpdate; Relationships: [] };
      restaurant_lists: { Row: ListRow; Insert: ListInsert; Update: ListUpdate; Relationships: [] };
      restaurant_list_items: { Row: ListItemRow; Insert: ListItemInsert; Update: ListItemUpdate; Relationships: [] };
      follows: { Row: FollowRow; Insert: FollowInsert; Update: FollowUpdate; Relationships: [] };
      push_subscriptions: { Row: PushSubscriptionRow; Insert: PushSubscriptionInsert; Update: PushSubscriptionUpdate; Relationships: [] };
      follow_push_events: { Row: FollowPushEventRow; Insert: FollowPushEventInsert; Update: FollowPushEventUpdate; Relationships: [] };
    };
    Views: {
      review_social_summaries: { Row: ReviewSocialSummaryRow; Relationships: [] };
    };
    Functions: {
      publish_review: { Args: { p_restaurant_id: string; p_rating: number; p_comment: string; p_amount_per_person: number | null; p_visit_date: string; p_photos: Array<{ storage_path: string; position: number }> }; Returns: string };
      publish_review_dimensions: { Args: { p_restaurant_id: string; p_food_rating: number; p_service_rating: number; p_ambience_rating: number; p_comment: string; p_amount_per_person: number | null; p_visit_date: string; p_photos: Array<{ storage_path: string; position: number }> }; Returns: string };
      update_review_owned: { Args: { p_review_id: string; p_comment: string; p_amount_per_person: number | null; p_visit_date: string; p_photos: Array<{ storage_path: string; position: number }> }; Returns: Array<{ review_id: string; updated_at: string; removed_paths: string[] }> };
      delete_review_owned: { Args: { p_review_id: string }; Returns: Array<{ review_id: string; removed_paths: string[]; visited_entry_removed: boolean }> };
      merge_restaurant: { Args: { p_pending_id: string; p_target_id: string }; Returns: string };
      claim_follow_push_event: { Args: { p_following_id: string }; Returns: Array<{ event_id: string; follower_id: string; following_id: string }> };
    };
    Enums: { app_role: AppRole; restaurant_category: RestaurantCategory; restaurant_status: RestaurantStatus; list_type: ListType; price_range: PriceRange };
    CompositeTypes: Record<string, never>;
  };
}

export type ProfileRow = { id: string; username: string; name: string; avatar_url: string | null; bio: string; location: string; role: AppRole; created_at: string; updated_at: string; };
export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at"> & { created_at?: string; updated_at?: string };
export type ProfileUpdate = Partial<ProfileInsert>;
export type RestaurantRow = { id: string; slug: string; name: string; address: string; city: string; neighborhood: string; latitude: number; longitude: number; category: RestaurantCategory; cuisines: string[]; price_range: PriceRange; instagram: string | null; website: string | null; phone: string | null; chef: string; cover_photo_url: string | null; cover_photo_path: string | null; google_place_id: string | null; status: RestaurantStatus; submitted_by: string | null; submitted_at: string | null; moderated_by: string | null; moderated_at: string | null; rejection_reason: string | null; merged_into_id: string | null; created_at: string; updated_at: string; };
export type RestaurantInsert = Omit<RestaurantRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
export type RestaurantUpdate = Partial<RestaurantInsert>;
export type ReviewRow = { id: string; user_id: string; restaurant_id: string; rating: number | null; rating_method: "legacy" | "dimensions"; food_rating: number | null; service_rating: number | null; ambience_rating: number | null; comment: string; amount_per_person: number | null; visit_date: string; created_at: string; updated_at: string; };
export type ReviewInsert = Omit<ReviewRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
export type ReviewUpdate = Partial<ReviewInsert>;
export type ReviewPhotoRow = { id: string; review_id: string; storage_path: string; position: number; created_at: string; };
export type ReviewPhotoInsert = Omit<ReviewPhotoRow, "id" | "created_at"> & { id?: string; created_at?: string };
export type ReviewPhotoUpdate = Partial<ReviewPhotoInsert>;
export type ReviewLikeRow = { review_id: string; user_id: string; created_at: string; };
export type ReviewLikeInsert = Omit<ReviewLikeRow, "user_id" | "created_at"> & { user_id?: string; created_at?: string; };
export type ReviewLikeUpdate = Partial<ReviewLikeInsert>;
export type ReviewCommentRow = { id: string; review_id: string; user_id: string; body: string; created_at: string; updated_at: string; };
export type ReviewCommentInsert = Omit<ReviewCommentRow, "id" | "user_id" | "created_at" | "updated_at"> & { id?: string; user_id?: string; created_at?: string; updated_at?: string; };
export type ReviewCommentUpdate = Partial<Pick<ReviewCommentRow, "body">>;
export type ReviewSocialSummaryRow = { review_id: string; like_count: number; comment_count: number; liked_by_me: boolean; };
export type ListRow = { id: string; owner_id: string; name: string; description: string; is_public: boolean; type: ListType; cover_photo_url: string | null; created_at: string; updated_at: string; };
export type ListInsert = Omit<ListRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
export type ListUpdate = Partial<ListInsert>;
export type ListItemRow = { list_id: string; restaurant_id: string; created_at: string; };
export type ListItemInsert = Omit<ListItemRow, "created_at"> & { created_at?: string };
export type ListItemUpdate = Partial<ListItemInsert>;
export type FollowRow = { follower_id: string; following_id: string; created_at: string; };
export type FollowInsert = Omit<FollowRow, "created_at"> & { created_at?: string };
export type FollowUpdate = Partial<FollowInsert>;
export type PushSubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string; updated_at: string; };
export type PushSubscriptionInsert = Omit<PushSubscriptionRow, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string; };
export type PushSubscriptionUpdate = Partial<PushSubscriptionInsert>;
export type FollowPushEventRow = { id: string; follower_id: string; following_id: string; created_at: string; processed_at: string | null; };
export type FollowPushEventInsert = Omit<FollowPushEventRow, "id" | "created_at"> & { id?: string; created_at?: string; };
export type FollowPushEventUpdate = Partial<FollowPushEventInsert>;
