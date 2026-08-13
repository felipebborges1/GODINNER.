"use client";

import { useAppContext } from "./use-app-context";

export function useWantToVisit(restaurantId: string) {
  const { currentUserId, lists, toggleWantToVisit } = useAppContext();
  const wantList = lists.find((list) => list.ownerId === currentUserId && list.type === "want");
  return { isWanted: wantList?.restaurantIds.includes(restaurantId) ?? false, toggleWantToVisit };
}
