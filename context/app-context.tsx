"use client";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CURRENT_USER_ID, mockData, users } from "@/data/mocks";
import { normalize } from "@/lib/search";
import { dataMode, hasSupabasePublicEnv, supabaseConfigurationError } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mapFollow, mapList, mapNotification, mapProfile, mapRestaurant, mapReview, mapReviewPhoto } from "@/lib/supabase/mappers";
import { deleteReviewPersisted, listReviewLikes, publishReviewPersisted, REVIEW_LIKES_PAGE_SIZE, updateReviewPersisted } from "@/lib/data/repositories";
import { createSignedImageUrl, getAvatarUploadErrorMessage, removeProfileAvatar, removeReviewPhotos, uploadProfileAvatar, uploadUserImage } from "@/lib/supabase/storage";
import { canManageReviewComment, emptyReviewSocialSummary, REVIEW_COMMENTS_PAGE_SIZE, toggleReviewLikeSummary, validateReviewComment } from "@/lib/review-social";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/notifications";
import { averageReviewScore, getDimensionalReviewScore, getReviewScore } from "@/lib/review-rating";
import type { CommentMention, Follow, InAppNotification, PriceRange, Restaurant, RestaurantCoordinates, RestaurantList, Review, ReviewComment, ReviewDraft, ReviewLikeUser, ReviewSocialSummary, ReviewUpdateDraft, User } from "@/types";

export type RestaurantSubmission = { name: string; address: string; city: string; neighborhood: string; category: "restaurant" | "bar"; cuisine: string[]; priceRange: PriceRange; photo?: { url: string; alt: string; file?: File } | null; coordinates?: RestaurantCoordinates; instagram?: string; site?: string; phone?: string; chef?: string };
export type AdminRestaurantDraft = Pick<Restaurant, "name" | "address" | "city" | "neighborhood" | "category" | "cuisine" | "priceRange" | "instagram" | "site" | "phone" | "chef" | "coordinates">;
export type AdminResult = { ok: boolean; error?: string; restaurant?: Restaurant };

function refreshRestaurantReviewStats(restaurants: Restaurant[], reviews: Review[], restaurantId: string) {
  const restaurantReviews = reviews.filter((review) => review.restaurantId === restaurantId);
  const rating = averageReviewScore(restaurantReviews);
  return restaurants.map((restaurant) => restaurant.id === restaurantId ? {
    ...restaurant,
    godinnerRating: rating ?? 0,
    reviewCount: restaurantReviews.filter((review) => getReviewScore(review) !== null).length,
  } : restaurant);
}

function mapCommentMentions(rows: Array<{ comment_id: string; mentioned_user_id: string }>, profiles: User[]) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  return rows.reduce<Record<string, CommentMention[]>>((mentions, row) => {
    const profile = profilesById.get(row.mentioned_user_id);
    if (!profile) return mentions;
    const current = mentions[row.comment_id] ?? [];
    mentions[row.comment_id] = [...current, { commentId: row.comment_id, userId: profile.id, username: profile.username }];
    return mentions;
  }, {});
}

type AppContextValue = {
  dataMode: "mock" | "supabase";
  backendConfigured: boolean;
  isLoading: boolean;
  dataError: string | null;
  retryData: () => void;
  currentUserId: string | null;
  isAuthLoading: boolean;
  reviews: Review[];
  users: User[];
  restaurants: Restaurant[];
  lists: RestaurantList[];
  follows: Follow[];
  reviewSocial: Record<string, ReviewSocialSummary>;
  reviewLikes: Record<string, ReviewLikeUser[]>;
  reviewLikesHasMore: Record<string, boolean>;
  reviewLikesLoading: Record<string, boolean>;
  reviewLikesError: Record<string, boolean>;
  reviewComments: Record<string, ReviewComment[]>;
  reviewCommentsHasMore: Record<string, boolean>;
  notifications: InAppNotification[];
  notificationsHasMore: boolean;
  notificationsLoading: boolean;
  notificationsError: boolean;
  unreadNotificationCount: number;
  isToastOpen: boolean;
  toastMessage: string;
  showToast: (message?: string) => void;
  hideToast: () => void;
  toggleWantToVisit: (restaurantId: string) => Promise<boolean>;
  toggleRestaurantInList: (listId: string, restaurantId: string) => Promise<boolean>;
  createList: (draft: Pick<RestaurantList, "name" | "description" | "isPublic">, restaurantId?: string) => Promise<RestaurantList | null>;
  updateList: (listId: string, draft: Pick<RestaurantList, "name" | "description" | "isPublic">) => Promise<boolean>;
  deleteList: (listId: string) => Promise<boolean>;
  removeRestaurantFromList: (listId: string, restaurantId: string) => Promise<boolean>;
  toggleFollow: (userId: string) => Promise<boolean>;
  toggleReviewLike: (reviewId: string) => Promise<boolean>;
  loadReviewLikes: (reviewId: string, options?: { reset?: boolean }) => Promise<void>;
  loadReviewComments: (reviewId: string, options?: { targetCommentId?: string | null }) => Promise<void>;
  createReviewComment: (reviewId: string, body: string, replyToCommentId?: string | null) => Promise<ReviewComment | null>;
  deleteReviewComment: (reviewId: string, commentId: string) => Promise<boolean>;
  loadNotifications: (options?: { reset?: boolean }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  submitRestaurant: (draft: RestaurantSubmission) => Promise<{ restaurant?: Restaurant; duplicate?: Restaurant; error?: string }>;
  publishReview: (draft: ReviewDraft) => Promise<Review | null>;
  updateReview: (reviewId: string, draft: ReviewUpdateDraft) => Promise<Review | null>;
  deleteReview: (reviewId: string) => Promise<{ ok: boolean; cleanupFailed?: boolean }>;
  updateProfileAvatar: (file: File | null) => Promise<{ ok: boolean; avatar: string | null; error?: string }>;
  isAdmin: boolean;
  updateRestaurantAdmin: (restaurantId: string, draft: AdminRestaurantDraft) => AdminResult;
  approveRestaurant: (restaurantId: string) => Promise<AdminResult>;
  rejectRestaurant: (restaurantId: string, reason: string) => AdminResult;
  mergeRestaurant: (pendingId: string, targetPublishedId: string) => AdminResult;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const backendConfigured = dataMode === "supabase" && hasSupabasePublicEnv();
  const [sessionUserId, setSessionUserId] = useState<string | null>(dataMode === "mock" ? CURRENT_USER_ID : null);
  const [sessionRole, setSessionRole] = useState<"user" | "admin" | null>(dataMode === "mock" ? users.find((user) => user.id === CURRENT_USER_ID)?.role ?? null : null);
  const currentUserId = sessionUserId;
  const isAdmin = dataMode === "mock" ? users.find((user) => user.id === currentUserId)?.role === "admin" : sessionRole === "admin";
  const [isToastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Pronto!");
  const [lists, setLists] = useState(dataMode === "mock" ? mockData.restaurantLists : []);
  const [reviews, setReviews] = useState(dataMode === "mock" ? mockData.reviews : []);
  const [restaurants, setRestaurants] = useState(dataMode === "mock" ? mockData.restaurants : []);
  const [follows, setFollows] = useState(dataMode === "mock" ? mockData.follows : []);
  const [profiles, setProfiles] = useState<User[]>(dataMode === "mock" ? users : []);
  const [reviewSocial, setReviewSocial] = useState<Record<string, ReviewSocialSummary>>(() => Object.fromEntries((dataMode === "mock" ? mockData.reviews : []).map((review) => [review.id, emptyReviewSocialSummary()])));
  const [reviewLikes, setReviewLikes] = useState<Record<string, ReviewLikeUser[]>>({});
  const [reviewLikesHasMore, setReviewLikesHasMore] = useState<Record<string, boolean>>({});
  const [reviewLikesLoading, setReviewLikesLoading] = useState<Record<string, boolean>>({});
  const [reviewLikesError, setReviewLikesError] = useState<Record<string, boolean>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, ReviewComment[]>>({});
  const [reviewCommentsHasMore, setReviewCommentsHasMore] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [notificationsHasMore, setNotificationsHasMore] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const pendingCommentReviews = useRef(new Set<string>());
  const pendingLikeReviews = useRef(new Set<string>());
  const [isLoading, setIsLoading] = useState(dataMode === "supabase" && backendConfigured);
  const [isAuthLoading, setIsAuthLoading] = useState(dataMode === "supabase" && backendConfigured);
  const [dataError, setDataError] = useState<string | null>(supabaseConfigurationError);
  const [retryToken, setRetryToken] = useState(0);
  useEffect(() => {
    if (dataMode !== "supabase" || !backendConfigured) return;
    const supabaseClient = createSupabaseBrowserClient();
    if (!supabaseClient) return;
    type SupabaseBrowserClient = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
    let active = true;
    let loadSequence = 0;
    async function loadPersistedData(client: SupabaseBrowserClient, requestedUserId?: string | null) {
      const requestId = ++loadSequence;
      setIsLoading(true);
      setDataError(null);
      try {
        const resolvedUserId = requestedUserId === undefined
          ? (await client.auth.getUser()).data.user?.id ?? null
          : requestedUserId;
        if (!active || requestId !== loadSequence) return;
        setSessionUserId(resolvedUserId);
      const [profiles, restaurantRows, reviewRows, reviewPhotoRows, listRows, itemRows, followRows] = await Promise.all([
        client.from("profiles").select("*").order("created_at"),
        client.from("restaurants").select("*").order("created_at", { ascending: false }),
        client.from("reviews").select("*").order("created_at", { ascending: false }),
        client.from("review_photos").select("*").order("position", { ascending: true }),
        client.from("restaurant_lists").select("*").order("created_at"),
        client.from("restaurant_list_items").select("*").order("created_at"),
        client.from("follows").select("*").order("created_at"),
      ]);
      if (!active || requestId !== loadSequence) return;
      const queryError = [profiles, restaurantRows, reviewRows, reviewPhotoRows, listRows, itemRows, followRows].find((response) => response.error)?.error;
      if (queryError) {
        setDataError("Não conseguimos carregar seus dados agora.");
        setIsLoading(false);
        return;
      }
      const me = profiles.data?.find((profile) => profile.id === resolvedUserId);
      setSessionRole(me?.role ?? null);
      const mappedProfiles = (profiles.data ?? []).map((profile) => {
        const path = profile.avatar_url?.startsWith(`${profile.id}/`) ? profile.avatar_url : null;
        return mapProfile(profile, path ? `/api/profile-avatar/${profile.id}?v=${encodeURIComponent(path)}` : null);
      });
      if (!active || requestId !== loadSequence) return;
      setProfiles(mappedProfiles);
      const mappedRestaurants = await Promise.all((restaurantRows.data ?? []).map(async (restaurant) => {
        if (!restaurant.cover_photo_path) return mapRestaurant(restaurant);
        const signed = await createSignedImageUrl("restaurant-submissions", restaurant.cover_photo_path);
        return mapRestaurant({ ...restaurant, cover_photo_url: signed.data ?? restaurant.cover_photo_url });
      }));
      if (!active || requestId !== loadSequence) return;
      // Review photos are public only through their published review. Keep the
      // Storage bucket private and let the server issue the short-lived URL.
      const reviewPhotos = (reviewPhotoRows.data ?? []).map((photo) =>
        mapReviewPhoto(photo, `/api/review-photo/${photo.id}`),
      );
      if (!active || requestId !== loadSequence) return;
      const mappedReviews = (reviewRows.data ?? []).map((review) => mapReview(review, reviewPhotos.filter((photo): photo is NonNullable<typeof photo> => photo?.reviewId === review.id)));
      const socialRows = mappedReviews.length
        ? await client.from("review_social_summaries").select("review_id, like_count, comment_count, liked_by_me").in("review_id", mappedReviews.map((review) => review.id))
        : { data: [], error: null };
      if (!active || requestId !== loadSequence) return;
      if (socialRows.error) {
        setDataError("Não conseguimos carregar as interações agora.");
        setIsLoading(false);
        return;
      }
      const ratingsByRestaurant = new Map<string, Review[]>();
      mappedReviews.forEach((review) => {
        const restaurantReviews = ratingsByRestaurant.get(review.restaurantId) ?? [];
        restaurantReviews.push(review);
        ratingsByRestaurant.set(review.restaurantId, restaurantReviews);
      });
      setRestaurants(mappedRestaurants.map((restaurant) => {
        const restaurantReviews = ratingsByRestaurant.get(restaurant.id) ?? [];
        const rating = averageReviewScore(restaurantReviews);
        return {
          ...restaurant,
          godinnerRating: rating ?? 0,
          reviewCount: restaurantReviews.filter((review) => getReviewScore(review) !== null).length,
        };
      }));
      setReviews(mappedReviews);
      setReviewSocial(Object.fromEntries(mappedReviews.map((review) => {
        const social = socialRows.data?.find((item) => item.review_id === review.id);
        return [review.id, social ? { likeCount: Number(social.like_count), commentCount: Number(social.comment_count), likedByMe: social.liked_by_me } : emptyReviewSocialSummary()];
      })));
      setReviewLikes({});
      setReviewLikesHasMore({});
      setReviewLikesLoading({});
      setReviewLikesError({});
      setReviewComments({});
      setReviewCommentsHasMore({});
      setLists((listRows.data ?? []).map((list) => mapList(list, (itemRows.data ?? []).filter((item) => item.list_id === list.id).map((item) => item.restaurant_id))));
      setFollows((followRows.data ?? []).map(mapFollow));
      setDataError(null);
      setIsLoading(false);
      } catch {
        if (active && requestId === loadSequence) {
          setDataError("Falha ao carregar seus dados agora.");
          setSessionRole(null);
        }
      } finally {
        if (active && requestId === loadSequence) {
          setIsLoading(false);
          setIsAuthLoading(false);
        }
      }
    }
    void loadPersistedData(supabaseClient);
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setSessionUserId(nextUserId);
      if (event === "SIGNED_OUT") {
        loadSequence += 1;
        setSessionRole(null);
        setProfiles([]);
        setRestaurants([]);
        setReviews([]);
        setReviewSocial({});
        setReviewComments({});
        setReviewCommentsHasMore({});
        setNotifications([]);
        setNotificationsHasMore(false);
        setNotificationsError(false);
        setUnreadNotificationCount(0);
        setLists([]);
        setFollows([]);
        setIsLoading(false);
        setIsAuthLoading(false);
        window.setTimeout(() => { void loadPersistedData(supabaseClient, null); }, 0);
      }
      if (event === "SIGNED_IN") {
        setIsAuthLoading(true);
        window.setTimeout(() => { void loadPersistedData(supabaseClient, nextUserId); }, 0);
      }
    });
    return () => { active = false; authListener.subscription.unsubscribe(); };
  }, [backendConfigured, retryToken]);
  useEffect(() => {
    if (!currentUserId || dataMode !== "supabase" || !backendConfigured) return;
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const notificationsClient = client;
    let active = true;
    async function loadInitialNotifications() {
      setNotificationsLoading(true);
      setNotificationsError(false);
      const [response, unread] = await Promise.all([
        notificationsClient.from("notifications").select("*").order("created_at", { ascending: false }).range(0, NOTIFICATIONS_PAGE_SIZE),
        notificationsClient.from("notifications").select("*", { count: "exact", head: true }).is("read_at", null),
      ]);
      if (!active) return;
      if (response.error || unread.error) {
        setNotificationsError(true);
        setNotificationsLoading(false);
        return;
      }
      const received = (response.data ?? []).map(mapNotification);
      setNotifications(received.slice(0, NOTIFICATIONS_PAGE_SIZE));
      setNotificationsHasMore(received.length > NOTIFICATIONS_PAGE_SIZE);
      setUnreadNotificationCount(unread.count ?? 0);
      setNotificationsLoading(false);
    }
    void loadInitialNotifications();
    return () => { active = false; };
  }, [backendConfigured, currentUserId, retryToken]);
  const retryData = useCallback(() => setRetryToken((value) => value + 1), []);
  const showToast = useCallback((message = "Pronto!") => { setToastMessage(message); setToastOpen(true); }, []);
  const hideToast = useCallback(() => setToastOpen(false), []);
  const loadNotifications = useCallback(async (options?: { reset?: boolean }) => {
    const reset = Boolean(options?.reset);
    if (!currentUserId || notificationsLoading || (!reset && !notificationsHasMore)) return;
    if (dataMode !== "supabase" || !backendConfigured) { setNotificationsHasMore(false); return; }
    const client = createSupabaseBrowserClient();
    if (!client) return;
    setNotificationsLoading(true);
    const offset = reset ? 0 : notifications.length;
    const response = await client.from("notifications").select("*").order("created_at", { ascending: false }).range(offset, offset + NOTIFICATIONS_PAGE_SIZE);
    if (response.error) {
      setNotificationsError(true);
      setNotificationsLoading(false);
      return;
    }
      const received = (response.data ?? []).map(mapNotification);
      setNotifications((current) => reset ? received.slice(0, NOTIFICATIONS_PAGE_SIZE) : [...current, ...received.slice(0, NOTIFICATIONS_PAGE_SIZE).filter((item) => !current.some((existing) => existing.id === item.id))]);
      setNotificationsHasMore(received.length > NOTIFICATIONS_PAGE_SIZE);
      setNotificationsError(false);
      setNotificationsLoading(false);
  }, [backendConfigured, currentUserId, notifications.length, notificationsHasMore, notificationsLoading]);
  const markNotificationRead = useCallback(async (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.readAt || !currentUserId) return Boolean(notification);
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const result = await client.rpc("mark_notification_read", { p_notification_id: notificationId });
      if (result.error || !result.data) { showToast("Não foi possível marcar a notificação como lida."); return false; }
    }
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, readAt } : item));
    setUnreadNotificationCount((count) => Math.max(0, count - 1));
    return true;
  }, [backendConfigured, currentUserId, notifications, showToast]);
  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUserId || unreadNotificationCount === 0) return true;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const result = await client.rpc("mark_all_notifications_read", {});
      if (result.error) { showToast("Não foi possível marcar suas notificações como lidas."); return false; }
    }
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
    setUnreadNotificationCount(0);
    return true;
  }, [backendConfigured, currentUserId, showToast, unreadNotificationCount]);
  const toggleWantToVisit = useCallback(async (restaurantId: string) => {
    if (restaurants.find((restaurant) => restaurant.id === restaurantId)?.status === "rejected") return false;
    const wantList = lists.find((list) => list.ownerId === currentUserId && list.type === "want");
    if (!wantList || !currentUserId) return false;
    const isSaved = wantList.restaurantIds.includes(restaurantId);
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = isSaved
        ? await client.from("restaurant_list_items").delete().eq("list_id", wantList.id).eq("restaurant_id", restaurantId)
        : await client.from("restaurant_list_items").insert({ list_id: wantList.id, restaurant_id: restaurantId });
      if (response.error) return false;
    }
    setLists((current) => current.map((list) => list.id !== wantList.id ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [backendConfigured, currentUserId, lists, restaurants]);
  const toggleRestaurantInList = useCallback(async (listId: string, restaurantId: string) => {
    if (restaurants.find((restaurant) => restaurant.id === restaurantId)?.status === "rejected") return false;
    const target = lists.find((list) => list.id === listId && list.ownerId === currentUserId);
    if (!target || !currentUserId) return false;
    const isSaved = target.restaurantIds.includes(restaurantId);
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = isSaved
        ? await client.from("restaurant_list_items").delete().eq("list_id", listId).eq("restaurant_id", restaurantId)
        : await client.from("restaurant_list_items").insert({ list_id: listId, restaurant_id: restaurantId });
      if (response.error) return false;
    }
    setLists((current) => current.map((list) => list.id !== listId ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [backendConfigured, currentUserId, lists, restaurants]);
  const createList = useCallback(async (draft: Pick<RestaurantList, "name" | "description" | "isPublic">, restaurantId?: string) => {
    if (!currentUserId || !draft.name.trim()) return null;
    const restaurantIds = restaurantId ? [restaurantId] : [];
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return null;
      const inserted = await client.from("restaurant_lists").insert({ owner_id: currentUserId, name: draft.name.trim(), description: draft.description.trim(), is_public: draft.isPublic, type: "custom", cover_photo_url: restaurants.find((restaurant) => restaurant.id === restaurantId)?.coverPhoto.url ?? null }).select("*").single();
      if (inserted.error || !inserted.data) return null;
      if (restaurantId) {
        const item = await client.from("restaurant_list_items").insert({ list_id: inserted.data.id, restaurant_id: restaurantId });
        if (item.error) { await client.from("restaurant_lists").delete().eq("id", inserted.data.id).eq("owner_id", currentUserId); return null; }
      }
      const list = mapList(inserted.data, restaurantIds);
      setLists((current) => [list, ...current]);
      return list;
    }
    const list = { id: `list-${Date.now()}`, ownerId: currentUserId, name: draft.name.trim(), description: draft.description.trim(), isPublic: draft.isPublic, coverPhoto: restaurants.find((restaurant) => restaurant.id === restaurantId)?.coverPhoto.url ?? restaurants[0]?.coverPhoto.url ?? "", restaurantIds, type: "custom" as const };
    setLists((current) => [list, ...current]);
    return list;
  }, [backendConfigured, currentUserId, restaurants]);
  const updateList = useCallback(async (listId: string, draft: Pick<RestaurantList, "name" | "description" | "isPublic">) => {
    if (!currentUserId || !draft.name.trim()) return false;
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId || target.type !== "custom") return false;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = await client.from("restaurant_lists").update({ name: draft.name.trim(), description: draft.description.trim(), is_public: draft.isPublic }).eq("id", listId).eq("owner_id", currentUserId);
      if (response.error) return false;
    }
    setLists((current) => current.map((list) => list.id === listId ? { ...list, name: draft.name.trim(), description: draft.description.trim(), isPublic: draft.isPublic } : list));
    return true;
  }, [backendConfigured, currentUserId, lists]);
  const deleteList = useCallback(async (listId: string) => {
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId || target.type !== "custom") return false;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = await client.from("restaurant_lists").delete().eq("id", listId).eq("owner_id", currentUserId);
      if (response.error) return false;
    }
    setLists((current) => current.filter((list) => list.id !== listId));
    return true;
  }, [backendConfigured, currentUserId, lists]);
  const removeRestaurantFromList = useCallback(async (listId: string, restaurantId: string) => {
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId) return false;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = await client.from("restaurant_list_items").delete().eq("list_id", listId).eq("restaurant_id", restaurantId);
      if (response.error) return false;
    }
    setLists((current) => current.map((list) => list.id === listId ? { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== restaurantId) } : list));
    return true;
  }, [backendConfigured, currentUserId, lists]);
  const toggleFollow = useCallback(async (userId: string) => {
    if (!currentUserId || userId === currentUserId) return false;
    const existing = follows.some((follow) => follow.followerId === currentUserId && follow.followingId === userId);
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = existing
        ? await client.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", userId)
        : await client.from("follows").insert({ follower_id: currentUserId, following_id: userId });
      if (response.error) return false;
      if (!existing) void fetch("/api/push/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: userId }) }).catch(() => undefined);
    }
    setFollows((current) => existing ? current.filter((follow) => !(follow.followerId === currentUserId && follow.followingId === userId)) : [...current, { followerId: currentUserId, followingId: userId, createdAt: new Date().toISOString() }]);
    return !existing;
  }, [backendConfigured, currentUserId, follows]);
  const toggleReviewLike = useCallback(async (reviewId: string) => {
    if (!currentUserId || !reviews.some((review) => review.id === reviewId)) return false;
    const before = reviewSocial[reviewId] ?? emptyReviewSocialSummary();
    const likesBefore = reviewLikes[reviewId];
    const after = toggleReviewLikeSummary(before);
    setReviewSocial((current) => ({ ...current, [reviewId]: after }));
    setReviewLikes((current) => {
      const loaded = current[reviewId];
      if (!loaded || !currentUserId) return current;
      const currentProfile = profiles.find((profile) => profile.id === currentUserId);
      if (before.likedByMe) return { ...current, [reviewId]: loaded.filter((item) => item.userId !== currentUserId) };
      if (!currentProfile || loaded.some((item) => item.userId === currentUserId)) return current;
      return { ...current, [reviewId]: [{ userId: currentProfile.id, username: currentProfile.username, name: currentProfile.name, avatar: currentProfile.avatar, likedAt: new Date().toISOString() }, ...loaded] };
    });
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) {
        setReviewSocial((current) => ({ ...current, [reviewId]: before }));
        return false;
      }
      const result = before.likedByMe
        ? await client.from("review_likes").delete().eq("review_id", reviewId)
        : await client.from("review_likes").insert({ review_id: reviewId });
      if (result.error) {
        setReviewSocial((current) => ({ ...current, [reviewId]: before }));
        setReviewLikes((current) => likesBefore === undefined ? current : { ...current, [reviewId]: likesBefore });
        showToast("Não foi possível atualizar a curtida.");
        return false;
      }
    }
    return after.likedByMe;
  }, [backendConfigured, currentUserId, profiles, reviewLikes, reviewSocial, reviews, showToast]);
  const loadReviewLikes = useCallback(async (reviewId: string, options?: { reset?: boolean }) => {
    const reset = Boolean(options?.reset);
    const existing = reset ? [] : reviewLikes[reviewId] ?? [];
    if (!reviews.some((review) => review.id === reviewId) || pendingLikeReviews.current.has(reviewId) || (!reset && existing.length > 0 && !reviewLikesHasMore[reviewId])) return;
    if (dataMode !== "supabase" || !backendConfigured) {
      setReviewLikes((current) => ({ ...current, [reviewId]: existing }));
      setReviewLikesHasMore((current) => ({ ...current, [reviewId]: false }));
      return;
    }
    const client = createSupabaseBrowserClient();
    if (!client) return;
    pendingLikeReviews.current.add(reviewId);
    setReviewLikesLoading((current) => ({ ...current, [reviewId]: true }));
    setReviewLikesError((current) => ({ ...current, [reviewId]: false }));
    try {
      const response = await listReviewLikes(client, reviewId, existing.length);
      if (response.error) {
        setReviewLikesError((current) => ({ ...current, [reviewId]: true }));
        return;
      }
      const received = response.data ?? [];
      const nextUsers = received.slice(0, REVIEW_LIKES_PAGE_SIZE).flatMap((like) => {
        const profile = profiles.find((user) => user.id === like.user_id);
        return profile ? [{ userId: profile.id, username: profile.username, name: profile.name, avatar: profile.avatar, likedAt: like.created_at }] : [];
      });
      setReviewLikes((current) => {
        const previous = reset ? [] : current[reviewId] ?? [];
        return { ...current, [reviewId]: [...previous, ...nextUsers.filter((user) => !previous.some((item) => item.userId === user.userId))] };
      });
      setReviewLikesHasMore((current) => ({ ...current, [reviewId]: received.length > REVIEW_LIKES_PAGE_SIZE }));
    } finally {
      pendingLikeReviews.current.delete(reviewId);
      setReviewLikesLoading((current) => ({ ...current, [reviewId]: false }));
    }
  }, [backendConfigured, profiles, reviewLikes, reviewLikesHasMore, reviews]);
  const loadReviewComments = useCallback(async (reviewId: string, options?: { targetCommentId?: string | null }) => {
    const offset = (reviewComments[reviewId] ?? []).filter((comment) => !comment.parentCommentId).length;
    if (!reviews.some((review) => review.id === reviewId) || (offset > 0 && !reviewCommentsHasMore[reviewId])) return;
    if (dataMode !== "supabase" || !backendConfigured) {
      setReviewCommentsHasMore((current) => ({ ...current, [reviewId]: false }));
      return;
    }
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const response = await client.from("review_comments").select("id, review_id, user_id, body, parent_comment_id, reply_to_comment_id, created_at, updated_at").eq("review_id", reviewId).is("parent_comment_id", null).order("created_at", { ascending: true }).range(offset, offset + REVIEW_COMMENTS_PAGE_SIZE);
    if (response.error) {
      showToast("Não foi possível carregar os comentários.");
      return;
    }
    const received = response.data ?? [];
    const page = received.slice(0, REVIEW_COMMENTS_PAGE_SIZE);
    const targetResponse = options?.targetCommentId
      ? await client.from("review_comments").select("id, review_id, user_id, body, parent_comment_id, reply_to_comment_id, created_at, updated_at").eq("id", options.targetCommentId).eq("review_id", reviewId).maybeSingle()
      : { data: null, error: null };
    if (targetResponse.error) showToast("Não foi possível abrir o comentário indicado.");
    const targetRootId = targetResponse.data ? targetResponse.data.parent_comment_id ?? targetResponse.data.id : null;
    const forcedRootResponse = targetRootId && !page.some((comment) => comment.id === targetRootId)
      ? await client.from("review_comments").select("id, review_id, user_id, body, parent_comment_id, reply_to_comment_id, created_at, updated_at").eq("id", targetRootId).eq("review_id", reviewId).maybeSingle()
      : { data: null, error: null };
    if (forcedRootResponse.error) showToast("Não foi possível abrir a conversa indicada.");
    const roots = [...page, ...(forcedRootResponse.data ? [forcedRootResponse.data] : [])];
    const repliesResponse = roots.length
      ? await client.from("review_comments").select("id, review_id, user_id, body, parent_comment_id, reply_to_comment_id, created_at, updated_at").eq("review_id", reviewId).in("parent_comment_id", roots.map((comment) => comment.id)).order("created_at", { ascending: true })
      : { data: [], error: null };
    if (repliesResponse.error) showToast("Não foi possível carregar as respostas.");
    const loaded = [...roots, ...(repliesResponse.data ?? [])];
    const mentionsResponse = loaded.length
      ? await client.from("review_comment_mentions").select("comment_id, mentioned_user_id").in("comment_id", loaded.map((comment) => comment.id))
      : { data: [], error: null };
    if (mentionsResponse.error) showToast("Não foi possível carregar as menções dos comentários.");
    const mentionsByComment = mapCommentMentions(mentionsResponse.data ?? [], profiles);
    const nextComments = loaded.map((comment) => ({ id: comment.id, reviewId: comment.review_id, userId: comment.user_id, body: comment.body, parentCommentId: comment.parent_comment_id, replyToCommentId: comment.reply_to_comment_id, createdAt: comment.created_at, updatedAt: comment.updated_at, mentions: mentionsByComment[comment.id] ?? [] }));
    setReviewComments((current) => ({ ...current, [reviewId]: [...(current[reviewId] ?? []), ...nextComments.filter((comment) => !(current[reviewId] ?? []).some((item) => item.id === comment.id))] }));
    setReviewCommentsHasMore((current) => ({ ...current, [reviewId]: received.length > REVIEW_COMMENTS_PAGE_SIZE }));
  }, [backendConfigured, profiles, reviewComments, reviewCommentsHasMore, reviews, showToast]);
  const createReviewComment = useCallback(async (reviewId: string, value: string, replyToCommentId?: string | null) => {
    if (!currentUserId || !reviews.some((review) => review.id === reviewId)) return null;
    const checked = validateReviewComment(value);
    if (checked.error || pendingCommentReviews.current.has(reviewId)) return null;
    pendingCommentReviews.current.add(reviewId);
    try {
      let comment: ReviewComment;
      if (dataMode === "supabase" && backendConfigured) {
        const client = createSupabaseBrowserClient();
        if (!client) return null;
        const response = await client.rpc("create_review_comment", { p_review_id: reviewId, p_body: checked.body, p_reply_to_comment_id: replyToCommentId ?? null });
        if (response.error || !response.data) {
          showToast("Não foi possível publicar o comentário.");
          return null;
        }
        const mentionsResponse = await client.from("review_comment_mentions").select("comment_id, mentioned_user_id").eq("comment_id", response.data.id);
        const mentions = mentionsResponse.error ? [] : (mapCommentMentions(mentionsResponse.data ?? [], profiles)[response.data.id] ?? []);
        comment = { id: response.data.id, reviewId: response.data.review_id, userId: response.data.user_id, body: response.data.body, parentCommentId: response.data.parent_comment_id, replyToCommentId: response.data.reply_to_comment_id, createdAt: response.data.created_at, updatedAt: response.data.updated_at, mentions };
      } else {
        const now = new Date().toISOString();
        const target = replyToCommentId ? reviewComments[reviewId]?.find((item) => item.id === replyToCommentId) : null;
        comment = { id: `comment-${Date.now()}`, reviewId, userId: currentUserId, body: checked.body, parentCommentId: target ? target.parentCommentId ?? target.id : null, replyToCommentId: target?.id ?? null, createdAt: now, updatedAt: now, mentions: [] };
      }
      setReviewComments((current) => ({ ...current, [reviewId]: [...(current[reviewId] ?? []), comment] }));
      setReviewSocial((current) => ({ ...current, [reviewId]: { ...(current[reviewId] ?? emptyReviewSocialSummary()), commentCount: (current[reviewId]?.commentCount ?? 0) + 1 } }));
      showToast(replyToCommentId ? "Resposta publicada." : "Comentário publicado.");
      return comment;
    } finally {
      pendingCommentReviews.current.delete(reviewId);
    }
  }, [backendConfigured, currentUserId, profiles, reviewComments, reviews, showToast]);
  const deleteReviewComment = useCallback(async (reviewId: string, commentId: string) => {
    const comment = reviewComments[reviewId]?.find((item) => item.id === commentId);
    if (!comment || !canManageReviewComment(comment, currentUserId, isAdmin)) return false;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return false;
      const response = await client.from("review_comments").delete().eq("id", commentId);
      if (response.error) {
        showToast("Não foi possível remover o comentário.");
        return false;
      }
    }
    const deletedIds = new Set([commentId, ...(reviewComments[reviewId] ?? []).filter((item) => item.parentCommentId === commentId).map((item) => item.id)]);
    setReviewComments((current) => ({ ...current, [reviewId]: (current[reviewId] ?? []).filter((item) => !deletedIds.has(item.id)) }));
    setReviewSocial((current) => ({ ...current, [reviewId]: { ...(current[reviewId] ?? emptyReviewSocialSummary()), commentCount: Math.max(0, (current[reviewId]?.commentCount ?? 0) - deletedIds.size) } }));
    showToast("Comentário removido.");
    return true;
  }, [backendConfigured, currentUserId, isAdmin, reviewComments, showToast]);
  const updateProfileAvatar = useCallback(async (file: File | null) => {
    if (!currentUserId) return { ok: false, avatar: null, error: "Entre para alterar sua foto." };
    const current = profiles.find((profile) => profile.id === currentUserId);
    if (!current) return { ok: false, avatar: null, error: "Perfil não encontrado." };
    const previousPath = current.avatarPath;
    const previousAvatar = current.avatar;
    if (dataMode !== "supabase" || !backendConfigured) {
      const nextAvatar = file ? URL.createObjectURL(file) : null;
      setProfiles((items) => items.map((profile) => profile.id === currentUserId ? { ...profile, avatar: nextAvatar, avatarPath: null } : profile));
      return { ok: true, avatar: nextAvatar };
    }
    const client = createSupabaseBrowserClient();
    if (!client) return { ok: false, avatar: previousAvatar, error: "Supabase não está configurado." };
    if (!file) {
      const cleared = await client.from("profiles").update({ avatar_url: null }).eq("id", currentUserId).select("*").single();
      if (cleared.error) return { ok: false, avatar: previousAvatar, error: "Não foi possível remover sua foto." };
      if (previousPath) {
        const removed = await removeProfileAvatar(previousPath);
        if (removed.error) {
          await client.from("profiles").update({ avatar_url: previousPath }).eq("id", currentUserId);
          return { ok: false, avatar: previousAvatar, error: "Não foi possível remover sua foto. Tente novamente." };
        }
      }
      setProfiles((items) => items.map((profile) => profile.id === currentUserId ? { ...profile, avatar: null, avatarPath: null } : profile));
      return { ok: true, avatar: null };
    }
    const uploaded = await uploadProfileAvatar(currentUserId, file);
    if (uploaded.error || !uploaded.data) return { ok: false, avatar: previousAvatar, error: getAvatarUploadErrorMessage(uploaded.error) };
    const updated = await client.from("profiles").update({ avatar_url: uploaded.data.path }).eq("id", currentUserId).select("*").single();
    if (updated.error) {
      await removeProfileAvatar(uploaded.data.path);
      return { ok: false, avatar: previousAvatar, error: "Não foi possível salvar sua foto." };
    }
    if (previousPath) {
      const removed = await removeProfileAvatar(previousPath);
      if (removed.error) {
        await client.from("profiles").update({ avatar_url: previousPath }).eq("id", currentUserId);
        await removeProfileAvatar(uploaded.data.path);
        return { ok: false, avatar: previousAvatar, error: "Não foi possível alterar sua foto. Tente novamente." };
      }
    }
    const avatar = `/api/profile-avatar/${currentUserId}?v=${encodeURIComponent(uploaded.data.path)}`;
    setProfiles((items) => items.map((profile) => profile.id === currentUserId ? { ...profile, avatar, avatarPath: uploaded.data.path } : profile));
    return { ok: true, avatar };
  }, [backendConfigured, currentUserId, profiles]);
  const submitRestaurant = useCallback(async (draft: RestaurantSubmission) => {
    if (!currentUserId) return { error: "Entre para adicionar um restaurante." };
    const normalizedName = normalize(draft.name);
    if (normalizedName.length < 2) return { error: "Informe um nome válido." };
    if (!draft.city.trim()) return { error: "Informe a cidade do restaurante." };
    if (!draft.coordinates) return { error: "Marque a localização do restaurante no mapa para continuar." };
    const duplicate = restaurants.find((restaurant) => normalize(restaurant.name) === normalizedName);
    if (duplicate) return { duplicate };
    const baseSlug = normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = restaurants.some((restaurant) => restaurant.slug === baseSlug) ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
    const index = restaurants.length;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return { error: "Não foi possível cadastrar o restaurante." };
      const upload = draft.photo?.file ? await uploadUserImage(currentUserId, draft.photo.file, "restaurant-submissions") : null;
      if (upload?.error || (draft.photo?.file && !upload?.data)) return { error: "Não foi possível enviar a foto." };
      const coordinates = draft.coordinates;
      const inserted = await client.from("restaurants").insert({ slug: baseSlug, name: draft.name.trim(), address: draft.address.trim(), city: draft.city, neighborhood: draft.neighborhood.trim(), latitude: coordinates.latitude, longitude: coordinates.longitude, category: draft.category, cuisines: draft.cuisine, price_range: draft.priceRange, instagram: draft.instagram ?? null, website: draft.site ?? null, phone: draft.phone ?? null, chef: draft.chef?.trim() ?? "", cover_photo_url: null, cover_photo_path: upload?.data?.path ?? null, google_place_id: null, status: "pending_review", submitted_by: currentUserId, submitted_at: new Date().toISOString(), moderated_by: null, moderated_at: null, rejection_reason: null, merged_into_id: null }).select("*").single();
      if (inserted.error || !inserted.data) return { error: "Não foi possível cadastrar o restaurante." };
      const restaurant = mapRestaurant({ ...inserted.data, cover_photo_url: upload?.data?.url ?? null });
      setRestaurants((current) => [restaurant, ...current]);
      return { restaurant };
    }
    const restaurantCoordinates = draft.coordinates;
    const fallbackPhoto = { id: `cover-${Date.now()}`, url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", alt: draft.name.trim() };
    const submittedPhoto = draft.photo ? { id: `cover-${Date.now()}`, ...draft.photo } : fallbackPhoto;
    const restaurant: Restaurant = { id: `restaurant-${Date.now()}`, slug, name: draft.name.trim(), address: draft.address.trim(), city: draft.city, neighborhood: draft.neighborhood.trim(), category: draft.category, cuisine: draft.cuisine, priceRange: draft.priceRange, coverPhoto: submittedPhoto, photos: draft.photo ? [submittedPhoto] : [], tags: ["new"], chef: draft.chef?.trim() ?? "", occasions: ["friends"], isOpenNow: false, distanceKm: Number((2.4 + (index % 5) * .4).toFixed(1)), coordinates: restaurantCoordinates, godinnerRating: 0, friendsRating: 0, reviewCount: 0, status: "pending_review", submittedBy: currentUserId, submittedAt: new Date().toISOString(), instagram: draft.instagram, site: draft.site, phone: draft.phone };
    setRestaurants((current) => [...current, restaurant]);
    return { restaurant };
  }, [backendConfigured, currentUserId, restaurants]);
  const publishReview = useCallback(async (draft: ReviewDraft) => {
    if (!currentUserId) return null;
    const restaurant = restaurants.find((item) => item.id === draft.restaurantId);
    if (!restaurant || restaurant.status === "rejected") return null;
    let reviewId = `review-${Date.now()}`;
    let reviewPhotos = draft.photos;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return null;
      const uploaded: Array<{ storagePath: string; position: number; photo: Review["photos"][number] }> = [];
      for (const [position, photo] of draft.photos.entries()) {
        if (!photo.file) return null;
        const upload = await uploadUserImage(currentUserId, photo.file, "review-photos");
        if (upload.error || !upload.data) return null;
        uploaded.push({ storagePath: upload.data.path, position, photo: { ...photo, url: upload.data.url, file: undefined } });
      }
      const persisted = await publishReviewPersisted(client, { restaurantId: draft.restaurantId, foodRating: draft.foodRating as number, serviceRating: draft.serviceRating as number, ambienceRating: draft.ambienceRating as number, comment: draft.comment, amountPerPerson: draft.amountPerPerson, visitDate: draft.visitDate, photos: uploaded.map(({ storagePath, position }) => ({ storagePath, position })) });
      if (persisted.error || !persisted.data) return null;
      reviewId = persisted.data;
      reviewPhotos = uploaded.map(({ photo }) => photo);
    }
    const now = new Date().toISOString();
    const review: Review = { ...draft, photos: reviewPhotos, rating: getDimensionalReviewScore(draft.foodRating, draft.serviceRating, draft.ambienceRating) ?? 0, ratingMethod: "dimensions", id: reviewId, userId: currentUserId, createdAt: now, updatedAt: now };
    setReviews((current) => [review, ...current]);
    setReviewSocial((current) => ({ ...current, [reviewId]: emptyReviewSocialSummary() }));
    setLists((current) => current.map((list) => {
      if (list.ownerId !== currentUserId) return list;
      if (list.type === "visited" && !list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: [draft.restaurantId, ...list.restaurantIds] };
      if (list.type === "want" && list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== draft.restaurantId) };
      return list;
    }));
    return review;
  }, [backendConfigured, currentUserId, dataMode, restaurants]);
  const updateReview = useCallback(async (reviewId: string, draft: ReviewUpdateDraft) => {
    const existing = reviews.find((review) => review.id === reviewId);
    if (!existing || !currentUserId || (existing.userId !== currentUserId && !isAdmin)) return null;
    const restaurant = restaurants.find((item) => item.id === existing.restaurantId);
    if (!restaurant) return null;
    let nextPhotos = draft.photos;
    let updatedAt = new Date().toISOString();
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return null;
      const uploaded: Array<{ path: string; photo: Review["photos"][number] }> = [];
      for (const photo of draft.photos) {
        if (!photo.file) continue;
        const upload = await uploadUserImage(currentUserId, photo.file, "review-photos");
        if (upload.error || !upload.data) {
          await removeReviewPhotos(uploaded.map((item) => item.path));
          showToast("Não foi possível enviar uma das fotos.");
          return null;
        }
        uploaded.push({ path: upload.data.path, photo: { ...photo, storagePath: upload.data.path, url: upload.data.url, file: undefined } });
      }
      const uploadedByLocalId = new Map(uploaded.map((item) => [item.photo.id, item.photo]));
      nextPhotos = draft.photos.map((photo) => photo.file ? uploadedByLocalId.get(photo.id)! : photo);
      if (nextPhotos.some((photo) => !photo.storagePath)) {
        await removeReviewPhotos(uploaded.map((item) => item.path));
        showToast("Não foi possível identificar uma foto existente.");
        return null;
      }
      const persisted = await updateReviewPersisted(client, reviewId, {
        comment: draft.comment,
        amountPerPerson: draft.amountPerPerson,
        visitDate: draft.visitDate,
        photos: nextPhotos.map((photo, position) => ({ storagePath: photo.storagePath!, position })),
        });
        if (persisted.error || !persisted.data) {
          await removeReviewPhotos(uploaded.map((item) => item.path));
          console.error("[review:update]", JSON.stringify(persisted.error?.cause));
          showToast(persisted.error?.message || "Não foi possível atualizar a experiência.");
          return null;
        }
      updatedAt = persisted.data.updated_at;
      const cleanup = await removeReviewPhotos(persisted.data.removed_paths ?? []);
      if (cleanup.error) showToast("Experiência atualizada, mas uma foto antiga não pôde ser removida.");
    }
    const updated: Review = {
      ...existing,
      ...draft,
      photos: nextPhotos,
      updatedAt,
    };
    const nextReviews = reviews.map((review) => review.id === reviewId ? updated : review);
    setReviews(nextReviews);
    showToast("Experiência atualizada.");
    return updated;
  }, [backendConfigured, currentUserId, isAdmin, restaurants, reviews, showToast]);
  const deleteReview = useCallback(async (reviewId: string) => {
    const existing = reviews.find((review) => review.id === reviewId);
    if (!existing || !currentUserId || (existing.userId !== currentUserId && !isAdmin)) return { ok: false };
    let cleanupFailed = false;
    let visitedEntryRemoved = false;
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return { ok: false };
      const persisted = await deleteReviewPersisted(client, reviewId);
      if (persisted.error || !persisted.data) { showToast("Não foi possível excluir a experiência."); return { ok: false }; }
      visitedEntryRemoved = persisted.data.visited_entry_removed;
      const cleanup = await removeReviewPhotos(persisted.data.removed_paths ?? []);
      cleanupFailed = Boolean(cleanup.error);
    } else {
      visitedEntryRemoved = !reviews.some((review) => review.id !== reviewId && review.userId === existing.userId && review.restaurantId === existing.restaurantId);
    }
    const nextReviews = reviews.filter((review) => review.id !== reviewId);
    setReviews(nextReviews);
    setRestaurants((current) => refreshRestaurantReviewStats(current, nextReviews, existing.restaurantId));
    setReviewSocial((current) => { const { [reviewId]: _removed, ...rest } = current; return rest; });
    setReviewComments((current) => { const { [reviewId]: _removed, ...rest } = current; return rest; });
    setReviewCommentsHasMore((current) => { const { [reviewId]: _removed, ...rest } = current; return rest; });
    if (visitedEntryRemoved) setLists((current) => current.map((list) => list.ownerId === existing.userId && list.type === "visited" ? { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== existing.restaurantId) } : list));
    showToast(cleanupFailed ? "Experiência excluída, mas uma foto não pôde ser removida." : "Experiência excluída.");
    return { ok: true, cleanupFailed };
  }, [backendConfigured, currentUserId, isAdmin, reviews, showToast]);
  const adminGuard = useCallback(() => isAdmin ? null : "Acesso restrito.", [isAdmin]);
  const updateRestaurantAdmin = useCallback((restaurantId: string, draft: AdminRestaurantDraft): AdminResult => {
    const error = adminGuard(); if (error) return { ok: false, error };
    const current = restaurants.find((item) => item.id === restaurantId); if (!current) return { ok: false, error: "Restaurante não encontrado." };
    if (!draft.name.trim() || !draft.cuisine.length) return { ok: false, error: "Preencha nome e culinária." };
    const slug = current.slug;
    const restaurant = { ...current, ...draft, name: draft.name.trim(), address: draft.address.trim(), neighborhood: draft.neighborhood.trim(), chef: draft.chef.trim(), slug };
    setRestaurants((items) => items.map((item) => item.id === restaurantId ? restaurant : item));
    return { ok: true, restaurant };
  }, [adminGuard, restaurants]);
  const approveRestaurant = useCallback(async (restaurantId: string): Promise<AdminResult> => {
    const error = adminGuard(); if (error) return { ok: false, error };
    const current = restaurants.find((item) => item.id === restaurantId); if (!current) return { ok: false, error: "Restaurante não encontrado." }; if (current.status !== "pending_review") return { ok: false, error: "Restaurante já moderado." };
    const moderatedAt = new Date().toISOString();
    const restaurant = { ...current, status: "published" as const, moderatedBy: currentUserId ?? undefined, moderatedAt, rejectionReason: undefined, mergedIntoId: undefined };
    if (dataMode === "supabase" && backendConfigured) {
      const client = createSupabaseBrowserClient();
      if (!client) return { ok: false, error: "Não foi possível conectar à moderação." };
      const persisted = await client.from("restaurants").update({ status: "published", moderated_by: currentUserId, moderated_at: moderatedAt, rejection_reason: null, merged_into_id: null }).eq("id", restaurantId).eq("status", "pending_review").select("id").maybeSingle();
      if (persisted.error || !persisted.data) return { ok: false, error: "Não foi possível publicar este restaurante." };
    }
    setRestaurants((items) => items.map((item) => item.id === restaurantId ? restaurant : item)); return { ok: true, restaurant };
  }, [adminGuard, backendConfigured, currentUserId, restaurants]);
  const rejectRestaurant = useCallback((restaurantId: string, reason: string): AdminResult => {
    const error = adminGuard(); if (error) return { ok: false, error }; if (!reason.trim()) return { ok: false, error: "Informe o motivo da rejeição." };
    const current = restaurants.find((item) => item.id === restaurantId); if (!current) return { ok: false, error: "Restaurante não encontrado." }; if (current.status !== "pending_review") return { ok: false, error: "Restaurante já moderado." };
    const restaurant = { ...current, status: "rejected" as const, rejectionReason: reason.trim(), moderatedBy: currentUserId ?? undefined, moderatedAt: new Date().toISOString() };
    setRestaurants((items) => items.map((item) => item.id === restaurantId ? restaurant : item)); return { ok: true, restaurant };
  }, [adminGuard, currentUserId, restaurants]);
  const mergeRestaurant = useCallback((pendingId: string, targetId: string): AdminResult => {
    const error = adminGuard(); if (error) return { ok: false, error }; const source = restaurants.find((item) => item.id === pendingId); const target = restaurants.find((item) => item.id === targetId);
    if (!source || !target || source.id === target.id || source.status !== "pending_review" || (target.status ?? "published") !== "published") return { ok: false, error: "Destino inválido para mesclagem." };
    const movedReviews = reviews.filter((review) => review.restaurantId === source.id); const targetReviews = [...reviews.filter((review) => review.restaurantId === target.id), ...movedReviews];
    const rating = averageReviewScore(targetReviews); const restaurant = { ...target, godinnerRating: rating ?? target.godinnerRating, reviewCount: targetReviews.filter((review) => getReviewScore(review) !== null).length, photos: [...target.photos, ...movedReviews.flatMap((review) => review.photos)] };
    setReviews((items) => items.map((review) => review.restaurantId === source.id ? { ...review, restaurantId: target.id } : review));
    setLists((items) => items.map((list) => ({ ...list, restaurantIds: [...new Set(list.restaurantIds.map((id) => id === source.id ? target.id : id))] })));
    setRestaurants((items) => items.map((item) => item.id === target.id ? restaurant : item.id === source.id ? { ...item, status: "rejected" as const, rejectionReason: "duplicate", mergedIntoId: target.id, moderatedBy: currentUserId ?? undefined, moderatedAt: new Date().toISOString() } : item));
    return { ok: true, restaurant };
  }, [adminGuard, currentUserId, restaurants, reviews]);
  const value = useMemo(() => ({ dataMode, backendConfigured, isLoading, dataError, retryData, currentUserId, isAuthLoading, users: profiles, reviews, restaurants, lists, follows, reviewSocial, reviewLikes, reviewLikesHasMore, reviewLikesLoading, reviewLikesError, reviewComments, reviewCommentsHasMore, notifications, notificationsHasMore, notificationsLoading, notificationsError, unreadNotificationCount, isToastOpen, toastMessage, showToast, hideToast, toggleWantToVisit, toggleRestaurantInList, createList, updateList, deleteList, removeRestaurantFromList, toggleFollow, toggleReviewLike, loadReviewLikes, loadReviewComments, createReviewComment, deleteReviewComment, loadNotifications, markNotificationRead, markAllNotificationsRead, submitRestaurant, publishReview, updateReview, deleteReview, updateProfileAvatar, isAdmin, updateRestaurantAdmin, approveRestaurant, rejectRestaurant, mergeRestaurant }), [approveRestaurant, backendConfigured, createList, createReviewComment, currentUserId, dataError, deleteList, deleteReview, deleteReviewComment, follows, hideToast, isAdmin, isAuthLoading, isLoading, isToastOpen, lists, loadNotifications, loadReviewComments, loadReviewLikes, markAllNotificationsRead, markNotificationRead, mergeRestaurant, notifications, notificationsError, notificationsHasMore, notificationsLoading, profiles, publishReview, rejectRestaurant, removeRestaurantFromList, restaurants, retryData, reviewComments, reviewCommentsHasMore, reviewLikes, reviewLikesError, reviewLikesHasMore, reviewLikesLoading, reviewSocial, reviews, showToast, submitRestaurant, toastMessage, toggleFollow, toggleRestaurantInList, toggleReviewLike, toggleWantToVisit, unreadNotificationCount, updateList, updateProfileAvatar, updateRestaurantAdmin, updateReview]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
