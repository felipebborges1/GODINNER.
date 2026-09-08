"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { NewRestaurantClient } from "@/components/restaurant/new-restaurant-client";
import { useAppContext } from "@/hooks/use-app-context";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { Restaurant } from "@/types";
import { RestaurantSelector } from "./restaurant-selector";
import { ReviewForm } from "./review-form";

const selectedGooglePlaceStorageKey = "godinner.review.google-place.v1";
const manualPlaceQueryStorageKey = "godinner.review.manual-place-query.v1";

function storablePlace(place: GooglePlaceCandidate): GooglePlaceCandidate {
  // A restaurant Place ID is sufficient for the server-side preparation step.
  // Do not keep device coordinates or any review draft in the redirect flow.
  return {
    placeId: place.placeId,
    name: place.name,
    address: place.address,
    city: place.city,
    neighborhood: place.neighborhood,
    region: place.region,
    country: place.country,
    countryCode: place.countryCode,
    types: [],
  };
}

function restoredPlace(value: string | null): GooglePlaceCandidate | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<GooglePlaceCandidate>;
    if (!candidate.placeId || !candidate.name) return null;
    return storablePlace(candidate as GooglePlaceCandidate);
  } catch {
    return null;
  }
}

export function NewReviewClient() {
  const { restaurants, currentUserId } = useAppContext();
  const params = useSearchParams();
  const router = useRouter();
  const preset = restaurants.find((restaurant) => restaurant.slug === params.get("restaurant"));
  const [selected, setSelected] = useState<Restaurant | null>(preset ?? null);
  const [selectedExternal, setSelectedExternal] = useState<GooglePlaceCandidate | null>(null);
  const [manualQuery, setManualQuery] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [resumeAfterLogin, setResumeAfterLogin] = useState<"google-place" | "manual-place">("google-place");

  useEffect(() => {
    const resume = params.get("resume");
    if (resume !== "google-place" && resume !== "manual-place") return;
    router.replace("/review/new");
    if (resume === "google-place") {
      const saved = restoredPlace(window.sessionStorage.getItem(selectedGooglePlaceStorageKey));
      window.sessionStorage.removeItem(selectedGooglePlaceStorageKey);
      if (saved) setSelectedExternal(saved);
    } else {
      const savedQuery = window.sessionStorage.getItem(manualPlaceQueryStorageKey);
      window.sessionStorage.removeItem(manualPlaceQueryStorageKey);
      if (savedQuery) setManualQuery(savedQuery);
    }
  }, [params, router]);

  const selectExisting = (restaurant: Restaurant) => {
    setSelected(restaurant);
    router.replace(`/review/new?restaurant=${encodeURIComponent(restaurant.slug)}`);
  };

  const selectExternal = (place: GooglePlaceCandidate) => {
    if (!currentUserId) {
      window.sessionStorage.setItem(selectedGooglePlaceStorageKey, JSON.stringify(storablePlace(place)));
      setResumeAfterLogin("google-place");
      setLoginOpen(true);
      return;
    }
    setSelectedExternal(place);
  };

  const selectManualFallback = (query: string) => {
    if (!currentUserId) {
      window.sessionStorage.setItem(manualPlaceQueryStorageKey, query);
      setResumeAfterLogin("manual-place");
      setLoginOpen(true);
      return;
    }
    setManualQuery(query);
  };

  const returnToSelector = () => {
    setSelected(null);
    setSelectedExternal(null);
    setManualQuery(null);
    router.replace("/review/new");
  };

  if (selected) return <ReviewForm restaurant={selected}/>;
  if (selectedExternal) return <NewRestaurantClient initialPlace={selectedExternal} onBack={returnToSelector}/>;
  if (manualQuery !== null) return <NewRestaurantClient initialQuery={manualQuery} startManual onBack={returnToSelector}/>;

  return <>
    <RestaurantSelector onSelect={selectExisting} onSelectExternal={selectExternal} onManualFallback={selectManualFallback}/>
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={`/review/new?resume=${resumeAfterLogin}`}/>
  </>;
}
