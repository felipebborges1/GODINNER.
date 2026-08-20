"use client";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { CURRENT_USER_ID, mockData, users } from "@/data/mocks";
import { normalize } from "@/lib/search";
import { dataMode, hasSupabasePublicEnv, supabaseConfigurationError } from "@/lib/supabase/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mapFollow, mapList, mapProfile, mapRestaurant, mapReview, mapReviewPhoto } from "@/lib/supabase/mappers";
import { publishReviewPersisted } from "@/lib/data/repositories";
import { createSignedImageUrl, uploadUserImage } from "@/lib/supabase/storage";
import { mockRestaurantCoordinates } from "@/lib/distance";
import type { Follow, PriceRange, Restaurant, RestaurantCoordinates, RestaurantList, Review, User } from "@/types";

export type RestaurantSubmission = { name: string; address: string; city: "Belo Horizonte" | "Nova Lima"; neighborhood: string; category: "restaurant" | "bar"; cuisine: string[]; priceRange: PriceRange; photo?: { url: string; alt: string; file?: File } | null; coordinates?: RestaurantCoordinates; instagram?: string; site?: string; phone?: string; chef?: string };
export type AdminRestaurantDraft = Pick<Restaurant, "name" | "address" | "city" | "neighborhood" | "category" | "cuisine" | "priceRange" | "instagram" | "site" | "phone" | "chef" | "coordinates">;
export type AdminResult = { ok: boolean; error?: string; restaurant?: Restaurant };

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
  submitRestaurant: (draft: RestaurantSubmission) => Promise<{ restaurant?: Restaurant; duplicate?: Restaurant; error?: string }>;
  publishReview: (draft: Omit<Review, "id" | "userId" | "createdAt">) => Promise<Review | null>;
  isAdmin: boolean;
  updateRestaurantAdmin: (restaurantId: string, draft: AdminRestaurantDraft) => AdminResult;
  approveRestaurant: (restaurantId: string) => AdminResult;
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
      setProfiles((profiles.data ?? []).map(mapProfile));
      const mappedRestaurants = await Promise.all((restaurantRows.data ?? []).map(async (restaurant) => {
        if (!restaurant.cover_photo_path) return mapRestaurant(restaurant);
        const signed = await createSignedImageUrl("restaurant-submissions", restaurant.cover_photo_path);
        return mapRestaurant({ ...restaurant, cover_photo_url: signed.data ?? restaurant.cover_photo_url });
      }));
      if (!active || requestId !== loadSequence) return;
      const reviewPhotos = await Promise.all((reviewPhotoRows.data ?? []).map(async (photo) => {
        const signed = await client.storage.from("review-photos").createSignedUrl(photo.storage_path, 60 * 60);
        return signed.data?.signedUrl ? mapReviewPhoto(photo, signed.data.signedUrl) : null;
      }));
      if (!active || requestId !== loadSequence) return;
      const mappedReviews = (reviewRows.data ?? []).map((review) => mapReview(review, reviewPhotos.filter((photo): photo is NonNullable<typeof photo> => photo?.reviewId === review.id)));
      const ratingsByRestaurant = new Map<string, number[]>();
      mappedReviews.forEach((review) => {
        const ratings = ratingsByRestaurant.get(review.restaurantId) ?? [];
        ratings.push(review.rating);
        ratingsByRestaurant.set(review.restaurantId, ratings);
      });
      setRestaurants(mappedRestaurants.map((restaurant) => {
        const ratings = ratingsByRestaurant.get(restaurant.id) ?? [];
        return {
          ...restaurant,
          godinnerRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1)) : 0,
          reviewCount: ratings.length,
        };
      }));
      setReviews(mappedReviews);
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
  const retryData = useCallback(() => setRetryToken((value) => value + 1), []);
  const showToast = useCallback((message = "Pronto!") => { setToastMessage(message); setToastOpen(true); }, []);
  const hideToast = useCallback(() => setToastOpen(false), []);
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
    }
    setFollows((current) => existing ? current.filter((follow) => !(follow.followerId === currentUserId && follow.followingId === userId)) : [...current, { followerId: currentUserId, followingId: userId, createdAt: new Date().toISOString() }]);
    return !existing;
  }, [backendConfigured, currentUserId, follows]);
  const submitRestaurant = useCallback(async (draft: RestaurantSubmission) => {
    if (!currentUserId) return { error: "Entre para adicionar um restaurante." };
    const normalizedName = normalize(draft.name);
    if (normalizedName.length < 2) return { error: "Informe um nome válido." };
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
      const coordinates = draft.coordinates ?? mockRestaurantCoordinates(index, draft.city);
      const inserted = await client.from("restaurants").insert({ slug: baseSlug, name: draft.name.trim(), address: draft.address.trim(), city: draft.city, neighborhood: draft.neighborhood.trim(), latitude: coordinates.latitude, longitude: coordinates.longitude, category: draft.category, cuisines: draft.cuisine, price_range: draft.priceRange, instagram: draft.instagram ?? null, website: draft.site ?? null, phone: draft.phone ?? null, chef: draft.chef?.trim() ?? "", cover_photo_url: null, cover_photo_path: upload?.data?.path ?? null, google_place_id: null, status: "pending_review", submitted_by: currentUserId, submitted_at: new Date().toISOString(), moderated_by: null, moderated_at: null, rejection_reason: null, merged_into_id: null }).select("*").single();
      if (inserted.error || !inserted.data) return { error: "Não foi possível cadastrar o restaurante." };
      const restaurant = mapRestaurant({ ...inserted.data, cover_photo_url: upload?.data?.url ?? null });
      setRestaurants((current) => [restaurant, ...current]);
      return { restaurant };
    }
    const restaurantCoordinates = draft.coordinates ?? mockRestaurantCoordinates(index, draft.city);
    const fallbackPhoto = { id: `cover-${Date.now()}`, url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80", alt: draft.name.trim() };
    const submittedPhoto = draft.photo ? { id: `cover-${Date.now()}`, ...draft.photo } : fallbackPhoto;
    const restaurant: Restaurant = { id: `restaurant-${Date.now()}`, slug, name: draft.name.trim(), address: draft.address.trim(), city: draft.city, neighborhood: draft.neighborhood.trim(), category: draft.category, cuisine: draft.cuisine, priceRange: draft.priceRange, coverPhoto: submittedPhoto, photos: draft.photo ? [submittedPhoto] : [], tags: ["new"], chef: draft.chef?.trim() ?? "", occasions: ["friends"], isOpenNow: false, distanceKm: Number((2.4 + (index % 5) * .4).toFixed(1)), coordinates: restaurantCoordinates, godinnerRating: 0, friendsRating: 0, reviewCount: 0, status: "pending_review", submittedBy: currentUserId, submittedAt: new Date().toISOString(), instagram: draft.instagram, site: draft.site, phone: draft.phone };
    setRestaurants((current) => [...current, restaurant]);
    return { restaurant };
  }, [backendConfigured, currentUserId, restaurants]);
  const publishReview = useCallback(async (draft: Omit<Review, "id" | "userId" | "createdAt">) => {
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
      const persisted = await publishReviewPersisted(client, { restaurantId: draft.restaurantId, rating: draft.rating, comment: draft.comment, amountPerPerson: draft.amountPerPerson, visitDate: draft.visitDate, photos: uploaded.map(({ storagePath, position }) => ({ storagePath, position })) });
      if (persisted.error || !persisted.data) return null;
      reviewId = persisted.data;
      reviewPhotos = uploaded.map(({ photo }) => photo);
    }
    const review = { ...draft, photos: reviewPhotos, id: reviewId, userId: currentUserId, createdAt: new Date().toISOString() };
    setReviews((current) => [review, ...current]);
    setLists((current) => current.map((list) => {
      if (list.ownerId !== currentUserId) return list;
      if (list.type === "visited" && !list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: [draft.restaurantId, ...list.restaurantIds] };
      if (list.type === "want" && list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== draft.restaurantId) };
      return list;
    }));
    return review;
  }, [backendConfigured, currentUserId, restaurants]);
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
  const approveRestaurant = useCallback((restaurantId: string): AdminResult => {
    const error = adminGuard(); if (error) return { ok: false, error };
    const current = restaurants.find((item) => item.id === restaurantId); if (!current) return { ok: false, error: "Restaurante não encontrado." }; if (current.status !== "pending_review") return { ok: false, error: "Restaurante já moderado." };
    const restaurant = { ...current, status: "published" as const, moderatedBy: currentUserId ?? undefined, moderatedAt: new Date().toISOString(), rejectionReason: undefined, mergedIntoId: undefined };
    setRestaurants((items) => items.map((item) => item.id === restaurantId ? restaurant : item)); return { ok: true, restaurant };
  }, [adminGuard, currentUserId, restaurants]);
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
    const ratings = targetReviews.map((review) => review.rating); const restaurant = { ...target, godinnerRating: ratings.length ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)) : target.godinnerRating, reviewCount: targetReviews.length, photos: [...target.photos, ...movedReviews.flatMap((review) => review.photos)] };
    setReviews((items) => items.map((review) => review.restaurantId === source.id ? { ...review, restaurantId: target.id } : review));
    setLists((items) => items.map((list) => ({ ...list, restaurantIds: [...new Set(list.restaurantIds.map((id) => id === source.id ? target.id : id))] })));
    setRestaurants((items) => items.map((item) => item.id === target.id ? restaurant : item.id === source.id ? { ...item, status: "rejected" as const, rejectionReason: "duplicate", mergedIntoId: target.id, moderatedBy: currentUserId ?? undefined, moderatedAt: new Date().toISOString() } : item));
    return { ok: true, restaurant };
  }, [adminGuard, currentUserId, restaurants, reviews]);
  const value = useMemo(() => ({ dataMode, backendConfigured, isLoading, dataError, retryData, currentUserId, isAuthLoading, users: profiles, reviews, restaurants, lists, follows, isToastOpen, toastMessage, showToast, hideToast, toggleWantToVisit, toggleRestaurantInList, createList, updateList, deleteList, removeRestaurantFromList, toggleFollow, submitRestaurant, publishReview, isAdmin, updateRestaurantAdmin, approveRestaurant, rejectRestaurant, mergeRestaurant }), [approveRestaurant, backendConfigured, createList, currentUserId, dataError, deleteList, follows, hideToast, isAdmin, isAuthLoading, isLoading, isToastOpen, lists, mergeRestaurant, profiles, publishReview, rejectRestaurant, removeRestaurantFromList, restaurants, retryData, reviews, showToast, submitRestaurant, toastMessage, toggleFollow, toggleRestaurantInList, toggleWantToVisit, updateList, updateRestaurantAdmin]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
