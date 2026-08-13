"use client";
import { createContext, useCallback, useMemo, useState } from "react";
import { CURRENT_USER_ID, mockData } from "@/data/mocks";
import type { RestaurantList, Review } from "@/types";

type AppContextValue = {
  currentUserId: string | null;
  reviews: Review[];
  lists: RestaurantList[];
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
  publishReview: (draft: Omit<Review, "id" | "userId" | "createdAt">) => Review | null;
};
export const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const currentUserId = CURRENT_USER_ID;
  const [isToastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("Pronto!");
  const [lists, setLists] = useState(mockData.restaurantLists);
  const [reviews, setReviews] = useState(mockData.reviews);
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
    const list = { id: `list-${Date.now()}`, ownerId: currentUserId, name: draft.name.trim(), description: draft.description.trim(), isPublic: draft.isPublic, coverPhoto: mockData.restaurants.find((restaurant) => restaurant.id === restaurantId)?.coverPhoto.url ?? mockData.restaurants[0].coverPhoto.url, restaurantIds: restaurantId ? [restaurantId] : [], type: "custom" as const };
    setLists((current) => [list, ...current]);
    return list;
  }, [currentUserId]);
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
  const value = useMemo(() => ({ currentUserId, reviews, lists, isToastOpen, toastMessage, showToast, hideToast, toggleWantToVisit, toggleRestaurantInList, createList, updateList, deleteList, removeRestaurantFromList, publishReview }), [createList, currentUserId, deleteList, hideToast, isToastOpen, lists, publishReview, removeRestaurantFromList, reviews, showToast, toastMessage, toggleRestaurantInList, toggleWantToVisit, updateList]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
