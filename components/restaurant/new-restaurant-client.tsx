"use client";

import { ArrowLeft, MapPin, Navigation, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocationPicker } from "@/components/restaurant/location-picker";
import { ReviewForm } from "@/components/review/review-form";
import { useAppContext } from "@/hooks/use-app-context";
import { useGooglePlaceSearch } from "@/hooks/use-google-place-search";
import { trackEvent } from "@/lib/analytics";
import { distanceKm } from "@/lib/distance";
import type { GooglePlaceCandidate } from "@/lib/google-place-types";
import type { PriceRange, Restaurant, RestaurantCoordinates } from "@/types";

type Mode = "find" | "manual";

function selectedPlaceFromParams(params: ReturnType<typeof useSearchParams>): GooglePlaceCandidate | null {
  const placeId = params.get("placeId")?.trim();
  const name = params.get("name")?.trim();
  if (!placeId || !name) return null;
  const latitude = Number(params.get("latitude"));
  const longitude = Number(params.get("longitude"));
  return {
    placeId,
    name,
    address: params.get("address") ?? "",
    city: params.get("city") ?? undefined,
    neighborhood: params.get("neighborhood") ?? undefined,
    country: params.get("country") ?? undefined,
    coordinates: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined,
    types: [],
  };
}

export function NewRestaurantClient() {
  const params = useSearchParams();
  const initialSelectedPlace = selectedPlaceFromParams(params);
  const { submitRestaurant, createRestaurantFromGooglePlace } = useAppContext();
  const [mode, setMode] = useState<Mode>("find");
  const [query, setQuery] = useState(params.get("name") ?? "");
  const [position, setPosition] = useState<RestaurantCoordinates>();
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceCandidate | null>(() => initialSelectedPlace);
  const [address, setAddress] = useState(() => initialSelectedPlace?.address ?? "");
  const [city, setCity] = useState(() => initialSelectedPlace?.city ?? "");
  const [neighborhood, setNeighborhood] = useState(() => initialSelectedPlace?.neighborhood ?? "");
  const [manualName, setManualName] = useState(params.get("name") ?? "");
  const [manualAddress, setManualAddress] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualNeighborhood, setManualNeighborhood] = useState("");
  const [manualCoordinates, setManualCoordinates] = useState<RestaurantCoordinates>();
  const [created, setCreated] = useState<Restaurant | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = useRef(false);
  const { places, isLoading, error: finderError, searchPlaces, searchNearby } = useGooglePlaceSearch();

  useEffect(() => {
    if (mode !== "find" || query.trim().length < 2) return;
    const timer = window.setTimeout(() => { trackEvent("new_restaurant_search_started"); void searchPlaces(query, position); }, 350);
    return () => window.clearTimeout(timer);
  }, [mode, position, query, searchPlaces]);

  const choosePlace = (place: GooglePlaceCandidate) => {
    setSelectedPlace(place); setAddress(place.address); setCity(place.city ?? ""); setNeighborhood(place.neighborhood ?? ""); setMessage(null); setErrors({});
    trackEvent("new_restaurant_place_selected", { city: place.city, country: place.country });
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage("Localização indisponível. Você ainda pode buscar o restaurante pelo nome."); return; }
    setMessage("Buscando lugares perto de você…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const next = { latitude: coords.latitude, longitude: coords.longitude };
      setPosition(next); setQuery(""); trackEvent("new_restaurant_nearby_used");
      const results = await searchNearby(next);
      setMessage(results.length ? "Lugares perto de você" : "Não encontramos lugares próximos. Você ainda pode buscar pelo nome.");
    }, (error) => { setMessage(error.code === error.PERMISSION_DENIED ? "Não conseguimos acessar sua localização. Você ainda pode buscar o restaurante pelo nome." : "Não conseguimos obter sua localização. Você ainda pode buscar o restaurante pelo nome."); }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 });
  };

  const continueWithGooglePlace = async () => {
    if (!selectedPlace || busy.current) return;
    busy.current = true; setIsSubmitting(true); setErrors({});
    const result = await createRestaurantFromGooglePlace(selectedPlace.placeId, { address, city, neighborhood });
    busy.current = false; setIsSubmitting(false);
    if (result.error) { setErrors({ submit: result.error }); return; }
    if (result.restaurant) {
      trackEvent(result.existing ? "existing_restaurant_matched_from_google" : "new_restaurant_created_from_google", { city: result.restaurant.city });
      trackEvent("review_started_from_new_restaurant", { restaurantId: result.restaurant.id });
      setCreated(result.restaurant);
    }
  };

  const submitManual = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (manualName.trim().length < 2) next.name = "Informe um nome válido.";
    if (!manualAddress.trim()) next.address = "Informe o endereço.";
    if (!manualCity.trim()) next.city = "Informe a cidade.";
    if (!manualCoordinates) next.coordinates = "Marque a localização no mapa para continuar.";
    setErrors(next);
    if (Object.keys(next).length || busy.current) return;
    busy.current = true; setIsSubmitting(true);
    const result = await submitRestaurant({ name: manualName, address: manualAddress, city: manualCity, neighborhood: manualNeighborhood, category: "restaurant", cuisine: ["Não informada"], priceRange: "$$" as PriceRange, coordinates: manualCoordinates });
    busy.current = false; setIsSubmitting(false);
    if (result.duplicate) { setCreated(result.duplicate); return; }
    if (result.error) { setErrors({ submit: result.error }); return; }
    if (result.restaurant) { trackEvent("review_started_from_new_restaurant", { restaurantId: result.restaurant.id }); setCreated(result.restaurant); }
  };

  const openManual = () => { setMode("manual"); setErrors({}); setMessage(null); trackEvent("new_restaurant_manual_fallback"); };
  if (created) return <ReviewForm restaurant={created}/>;

  if (mode === "manual") return <main className="mx-auto max-w-2xl px-4 py-8 pb-28"><form onSubmit={submitManual} className="space-y-5"><button type="button" onClick={() => setMode("find")} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={17}/> Voltar para buscar</button><div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="mt-1 text-3xl font-black">Adicionar lugar manualmente</h1><p className="mt-2 text-sm text-stone-600">Se o lugar ainda não está no Google, marque a localização e continue para a sua review.</p></div><Field label="Nome do restaurante" error={errors.name}><input className="input" value={manualName} onChange={(event) => setManualName(event.target.value)} /></Field><LocationPicker value={manualCoordinates} onChange={setManualCoordinates} onAddressResolved={(result) => { setManualAddress(result.address); if (result.city) setManualCity(result.city); if (result.neighborhood) setManualNeighborhood(result.neighborhood); }} /><Field label="Endereço" error={errors.address}><input className="input" value={manualAddress} onChange={(event) => setManualAddress(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cidade" error={errors.city}><input className="input" value={manualCity} onChange={(event) => setManualCity(event.target.value)} /></Field><Field label="Bairro"><input className="input" value={manualNeighborhood} onChange={(event) => setManualNeighborhood(event.target.value)} /></Field></div>{errors.coordinates && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.coordinates}</p>}{errors.submit && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.submit}</p>}<button disabled={isSubmitting} className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white disabled:opacity-60">{isSubmitting ? "Preparando sua review…" : "Continuar para minha review"}</button></form></main>;

  return <main className="mx-auto max-w-2xl px-4 py-8 pb-28"><section className="space-y-5"><div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="mt-1 text-3xl font-black">Onde você está?</h1><p className="mt-2 text-sm text-stone-600">Encontre o lugar e avalie. O GODINNER completa os dados do restaurante.</p></div>{selectedPlace ? <section className="space-y-4 rounded-3xl border border-orange-200 bg-orange-50 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-orange-600">LUGAR SELECIONADO</p><h2 className="mt-1 text-xl font-black">{selectedPlace.name}</h2><p className="mt-1 text-sm text-stone-600">{selectedPlace.country ? `${selectedPlace.city ?? ""}${selectedPlace.city ? ", " : ""}${selectedPlace.country}` : selectedPlace.address}</p></div><button type="button" onClick={() => setSelectedPlace(null)} className="min-h-11 rounded-full px-3 text-sm font-bold text-stone-600">Trocar</button></div><Field label="Endereço"><input className="input" value={address} onChange={(event) => setAddress(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cidade"><input className="input" value={city} onChange={(event) => setCity(event.target.value)} /></Field><Field label="Bairro (opcional)"><input className="input" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></Field></div>{errors.submit && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.submit}</p>}<button type="button" disabled={isSubmitting} onClick={continueWithGooglePlace} className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white disabled:opacity-60">{isSubmitting ? "Preparando sua review…" : `Avaliar ${selectedPlace.name}`}</button></section> : <><label className="relative block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={19}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite o nome do restaurante" className="w-full rounded-2xl bg-stone-100 py-4 pl-11 pr-4 text-sm outline-none ring-orange-500 focus:ring-2" /></label><div className="flex flex-wrap gap-2"><button type="button" onClick={useLocation} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-60"><Navigation size={16}/> Usar minha localização</button><button type="button" onClick={openManual} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold"><MapPin size={16} className="text-orange-500"/> Selecionar no mapa</button></div>{(finderError || message) && <p role="status" className="text-sm text-stone-600">{finderError || message}</p>}{isLoading && <p role="status" className="text-sm font-semibold text-stone-500">Buscando lugares…</p>}{places.length > 0 && <div className="space-y-2"><p className="text-xs font-black uppercase tracking-wide text-stone-500">{position && !query ? "Lugares perto de você" : "Resultados do Google"}</p>{places.map((place) => <button type="button" key={place.placeId} onClick={() => choosePlace(place)} className="flex min-h-20 w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-100"><span className="min-w-0"><b className="block truncate text-sm">{place.name}</b><span className="mt-1 block truncate text-xs text-stone-500">{place.address || [place.neighborhood, place.city, place.country].filter(Boolean).join(" · ")}</span></span>{position && place.coordinates && <span className="shrink-0 text-xs font-bold text-stone-500">{Math.round(distanceKm(position, place.coordinates) * 1000)} m</span>}</button>)}</div>}{query && !isLoading && !places.length && <div className="rounded-3xl border border-dashed border-stone-300 p-5 text-center"><b>Não encontrou o restaurante?</b><button type="button" onClick={openManual} className="mt-2 block w-full text-sm font-black text-orange-600">Preencher manualmente</button></div>}</>}</section></main>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block font-bold">{label}</span>{children}{error && <span className="mt-2 block text-sm font-semibold text-red-600">{error}</span>}</label>; }
