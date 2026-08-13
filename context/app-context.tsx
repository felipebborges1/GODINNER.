"use client";
import { createContext, useCallback, useMemo, useState } from "react";
import { CURRENT_USER_ID, mockData, users } from "@/data/mocks";
import { normalize } from "@/lib/search";
import type { Follow, PriceRange, Restaurant, RestaurantList, Review } from "@/types";

export type RestaurantSubmission = { name: string; address: string; city: "Belo Horizonte" | "Nova Lima"; neighborhood: string; category: "restaurant" | "bar"; cuisine: string[]; priceRange: PriceRange; photo: { url: string; alt: string } | null; instagram?: string; site?: string; phone?: string; chef?: string };
export type AdminRestaurantDraft = Pick<Restaurant, "name" | "address" | "city" | "neighborhood" | "category" | "cuisine" | "priceRange" | "instagram" | "site" | "phone" | "chef" | "coordinates">;
export type AdminResult = { ok: boolean; error?: string; restaurant?: Restaurant };

type AppContextValue = {
  currentUserId: string | null;
  reviews: Review[];
  restaurants: Restaurant[];
  lists: RestaurantList[];
  follows: Follow[];
  isToastOpen: boolean;
  toastMessage: string;
  showToast: (message?: string) => void;
  hideToast: () => void;
  toggleWantToVisit: (restaurantId: string) => boolean;
  toggleRestaurantInList: (listId: string, restaurantId: string) => boolean;
  createList: (draft: Pick<RestaurantList, "name" | "description" | "isPublic">, restaurantId?: string) => RestaurantList | null;
  updateList: (listId: string, draft: Pick<RestaurantList, "name" | "description" | "isPublic">) => boolean;
  deleteList: (listId: string) => boolean;
  removeRestaurantFromList: (listId: string, restaurantId: string) => boolean;
  toggleFollow: (userId: string) => boolean;
  submitRestaurant: (draft: RestaurantSubmission) => { restaurant?: Restaurant; duplicate?: Restaurant; error?: string };
  publishReview: (draft: Omit<Review, "id" | "userId" | "createdAt">) => Review | null;
  isAdmin: boolean;
  updateRestaurantAdmin: (restaurantId: string, draft: AdminRestaurantDraft) => AdminResult;
  approveRestaurant: (restaurantId: string) => AdminResult;
  rejectRestaurant: (restaurantId: string, reason: string) => AdminResult;
  mergeRestaurant: (pendingId: string, targetPublishedId: string) => AdminResult;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = CURRENT_USER_ID;
  const isAdmin = users.find((user) => user.id === currentUserId)?.role === "admin";
  const [isToastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Pronto!");
  const [lists, setLists] = useState(mockData.restaurantLists);
  const [reviews, setReviews] = useState(mockData.reviews);
  const [restaurants, setRestaurants] = useState(mockData.restaurants);
  const [follows, setFollows] = useState(mockData.follows);
  const showToast = useCallback((message = "Pronto!") => { setToastMessage(message); setToastOpen(true); }, []);
  const hideToast = useCallback(() => setToastOpen(false), []);
  const toggleWantToVisit = useCallback((restaurantId: string) => {
    if (restaurants.find((restaurant) => restaurant.id === restaurantId)?.status === "rejected") return false;
    const wantList = lists.find((list) => list.ownerId === currentUserId && list.type === "want");
    if (!wantList) return false;
    const isSaved = wantList.restaurantIds.includes(restaurantId);
    setLists((current) => current.map((list) => list.id !== wantList.id ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [currentUserId, lists, restaurants]);
  const toggleRestaurantInList = useCallback((listId: string, restaurantId: string) => {
    if (restaurants.find((restaurant) => restaurant.id === restaurantId)?.status === "rejected") return false;
    const target = lists.find((list) => list.id === listId && list.ownerId === currentUserId);
    if (!target) return false;
    const isSaved = target.restaurantIds.includes(restaurantId);
    setLists((current) => current.map((list) => list.id !== listId ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [currentUserId, lists, restaurants]);
  const createList = useCallback((draft: Pick<RestaurantList, "name" | "description" | "isPublic">, restaurantId?: string) => {
    if (!currentUserId || !draft.name.trim()) return null;
    const list = { id: `list-${Date.now()}`, ownerId: currentUserId, name: draft.name.trim(), description: draft.description.trim(), isPublic: draft.isPublic, coverPhoto: restaurants.find((restaurant) => restaurant.id === restaurantId)?.coverPhoto.url ?? restaurants[0].coverPhoto.url, restaurantIds: restaurantId ? [restaurantId] : [], type: "custom" as const };
    setLists((current) => [list, ...current]);
    return list;
  }, [currentUserId, restaurants]);
  const updateList = useCallback((listId: string, draft: Pick<RestaurantList, "name" | "description" | "isPublic">) => {
    if (!currentUserId || !draft.name.trim()) return false;
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId || target.type !== "custom") return false;
    setLists((current) => current.map((list) => list.id === listId ? { ...list, name: draft.name.trim(), description: draft.description.trim(), isPublic: draft.isPublic } : list));
    return true;
  }, [currentUserId, lists]);
  const deleteList = useCallback((listId: string) => {
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId || target.type !== "custom") return false;
    setLists((current) => current.filter((list) => list.id !== listId));
    return true;
  }, [currentUserId, lists]);
  const removeRestaurantFromList = useCallback((listId: string, restaurantId: string) => {
    const target = lists.find((list) => list.id === listId);
    if (!target || target.ownerId !== currentUserId) return false;
    setLists((current) => current.map((list) => list.id === listId ? { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== restaurantId) } : list));
    return true;
  }, [currentUserId, lists]);
  const toggleFollow = useCallback((userId: string) => {
    if (!currentUserId || userId === currentUserId) return false;
    const existing = follows.some((follow) => follow.followerId === currentUserId && follow.followingId === userId);
    setFollows((current) => existing ? current.filter((follow) => !(follow.followerId === currentUserId && follow.followingId === userId)) : [...current, { followerId: currentUserId, followingId: userId, createdAt: new Date().toISOString() }]);
    return !existing;
  }, [currentUserId, follows]);
  const submitRestaurant = useCallback((draft: RestaurantSubmission) => {
    if (!currentUserId) return { error: "Entre para adicionar um restaurante." };
    if (!draft.photo) return { error: "Adicione uma foto." };
    const normalizedName = normalize(draft.name);
    if (normalizedName.length < 2) return { error: "Informe um nome válido." };
    const duplicate = restaurants.find((restaurant) => normalize(restaurant.name) === normalizedName);
    if (duplicate) return { duplicate };
    const baseSlug = normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = restaurants.some((restaurant) => restaurant.slug === baseSlug) ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
    const index = restaurants.length;
    const restaurant: Restaurant = { id: `restaurant-${Date.now()}`, slug, name: draft.name.trim(), address: draft.address.trim(), city: draft.city, neighborhood: draft.neighborhood.trim(), category: draft.category, cuisine: draft.cuisine, priceRange: draft.priceRange, coverPhoto: { id: `cover-${Date.now()}`, ...draft.photo }, photos: [{ id: `cover-${Date.now()}`, ...draft.photo }], tags: ["new"], chef: draft.chef?.trim() ?? "", occasions: ["friends"], isOpenNow: false, distanceKm: Number((2.4 + (index % 5) * .4).toFixed(1)), coordinates: { x: 20 + (index * 13) % 60, y: 20 + (index * 17) % 55, latitude: draft.city === "Nova Lima" ? -19.98 + (index % 3) * .004 : -19.94 + (index % 3) * .004, longitude: -43.95 + (index % 4) * .004 }, godinnerRating: 0, friendsRating: 0, reviewCount: 0, status: "pending_review", submittedBy: currentUserId, submittedAt: new Date().toISOString(), instagram: draft.instagram, site: draft.site, phone: draft.phone };
    setRestaurants((current) => [...current, restaurant]);
    return { restaurant };
  }, [currentUserId, restaurants]);
  const publishReview = useCallback((draft: Omit<Review, "id" | "userId" | "createdAt">) => {
    if (!currentUserId) return null;
    const restaurant = restaurants.find((item) => item.id === draft.restaurantId);
    if (!restaurant || restaurant.status === "rejected") return null;
    const review = { ...draft, id: `review-${Date.now()}`, userId: currentUserId, createdAt: new Date().toISOString() };
    setReviews((current) => [review, ...current]);
    setLists((current) => current.map((list) => {
      if (list.ownerId !== currentUserId) return list;
      if (list.type === "visited" && !list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: [draft.restaurantId, ...list.restaurantIds] };
      if (list.type === "want" && list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== draft.restaurantId) };
      return list;
    }));
    return review;
  }, [currentUserId, restaurants]);
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
  const value = useMemo(() => ({ currentUserId, reviews, restaurants, lists, follows, isToastOpen, toastMessage, showToast, hideToast, toggleWantToVisit, toggleRestaurantInList, createList, updateList, deleteList, removeRestaurantFromList, toggleFollow, submitRestaurant, publishReview, isAdmin, updateRestaurantAdmin, approveRestaurant, rejectRestaurant, mergeRestaurant }), [approveRestaurant, createList, currentUserId, deleteList, follows, hideToast, isAdmin, isToastOpen, lists, mergeRestaurant, publishReview, rejectRestaurant, removeRestaurantFromList, restaurants, reviews, showToast, submitRestaurant, toastMessage, toggleFollow, toggleRestaurantInList, toggleWantToVisit, updateList, updateRestaurantAdmin]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
