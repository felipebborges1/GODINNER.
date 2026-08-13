"use client";
import { createContext, useCallback, useMemo, useState } from "react";
import { CURRENT_USER_ID, mockData } from "@/data/mocks";
import { normalize } from "@/lib/search";
import type { Follow, PriceRange, Restaurant, RestaurantList, Review } from "@/types";

export type RestaurantSubmission = { name: string; address: string; city: "Belo Horizonte" | "Nova Lima"; neighborhood: string; category: "restaurant" | "bar"; cuisine: string[]; priceRange: PriceRange; photo: { url: string; alt: string } | null; instagram?: string; site?: string; phone?: string; chef?: string };

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
};
export const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = CURRENT_USER_ID;
  const [isToastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Pronto!");
  const [lists, setLists] = useState(mockData.restaurantLists);
  const [reviews, setReviews] = useState(mockData.reviews);
  const [restaurants, setRestaurants] = useState(mockData.restaurants);
  const [follows, setFollows] = useState(mockData.follows);
  const showToast = useCallback((message = "Pronto!") => { setToastMessage(message); setToastOpen(true); }, []);
  const hideToast = useCallback(() => setToastOpen(false), []);
  const toggleWantToVisit = useCallback((restaurantId: string) => {
    const wantList = lists.find((list) => list.ownerId === currentUserId && list.type === "want");
    if (!wantList) return false;
    const isSaved = wantList.restaurantIds.includes(restaurantId);
    setLists((current) => current.map((list) => list.id !== wantList.id ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [currentUserId, lists]);
  const toggleRestaurantInList = useCallback((listId: string, restaurantId: string) => {
    const target = lists.find((list) => list.id === listId && list.ownerId === currentUserId);
    if (!target) return false;
    const isSaved = target.restaurantIds.includes(restaurantId);
    setLists((current) => current.map((list) => list.id !== listId ? list : { ...list, restaurantIds: isSaved ? list.restaurantIds.filter((id) => id !== restaurantId) : [...list.restaurantIds, restaurantId] }));
    return !isSaved;
  }, [currentUserId, lists]);
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
    const review = { ...draft, id: `review-${Date.now()}`, userId: currentUserId, createdAt: new Date().toISOString() };
    setReviews((current) => [review, ...current]);
    setLists((current) => current.map((list) => {
      if (list.ownerId !== currentUserId) return list;
      if (list.type === "visited" && !list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: [draft.restaurantId, ...list.restaurantIds] };
      if (list.type === "want" && list.restaurantIds.includes(draft.restaurantId)) return { ...list, restaurantIds: list.restaurantIds.filter((id) => id !== draft.restaurantId) };
      return list;
    }));
    return review;
  }, [currentUserId]);
  const value = useMemo(() => ({ currentUserId, reviews, restaurants, lists, follows, isToastOpen, toastMessage, showToast, hideToast, toggleWantToVisit, toggleRestaurantInList, createList, updateList, deleteList, removeRestaurantFromList, toggleFollow, submitRestaurant, publishReview }), [createList, currentUserId, deleteList, follows, hideToast, isToastOpen, lists, publishReview, removeRestaurantFromList, restaurants, reviews, showToast, submitRestaurant, toastMessage, toggleFollow, toggleRestaurantInList, toggleWantToVisit, updateList]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
