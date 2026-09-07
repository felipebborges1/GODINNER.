"use client";

import { useContext } from "react";
import { ExploreLocationContext } from "@/context/explore-location-context";

export function useExploreLocation() {
  const value = useContext(ExploreLocationContext);
  if (!value) throw new Error("useExploreLocation must be used inside ExploreLocationProvider");
  return value;
}
