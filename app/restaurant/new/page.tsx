import { Suspense } from "react";import { NewRestaurantClient } from "@/components/restaurant/new-restaurant-client";
export default function NewRestaurantPage(){return <Suspense fallback={<div className="mx-auto max-w-xl px-4 py-10">Carregando…</div>}><NewRestaurantClient/></Suspense>}
