"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { ArrowUpRight, LocateFixed, LoaderCircle, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GooglePlaceCover } from "@/components/restaurant/google-place-cover";
import { hasCoordinates } from "@/lib/distance";
import type { Restaurant } from "@/types";

type LatLng = { lat: number; lng: number };
type MapListener = { remove: () => void };
type MapBounds = { extend: (position: LatLng) => void };
type MapProjection = { fromLatLngToDivPixel: (position: LatLng) => { x: number; y: number } | null };
type OverlayViewInstance = {
  draw?: () => void;
  getPanes: () => { overlayMouseTarget: HTMLElement } | null;
  getProjection: () => MapProjection;
  onAdd?: () => void;
  onRemove?: () => void;
  setMap: (map: MapInstance | null) => void;
};
type MapInstance = {
  fitBounds: (bounds: MapBounds, padding?: number | { top: number; right: number; bottom: number; left: number }) => void;
  getZoom: () => number | undefined;
  panTo: (position: LatLng) => void;
  setZoom: (zoom: number) => void;
  addListener: (eventName: string, handler: () => void) => MapListener;
};
type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  setSelected: (selected: boolean) => void;
};
type MapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  LatLngBounds: new () => MapBounds;
  OverlayView: new () => OverlayViewInstance;
  importLibrary?: (library: "maps" | "core") => Promise<Partial<MapsApi>>;
};

declare global {
  interface Window {
    google?: { maps: MapsApi };
    __godinnerGoogleMapsLoaded?: () => void;
  }
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const defaultCenter = { lat: -19.956, lng: -43.946 };
const googleMapsReadyEvent = "godinner-google-maps-ready";

if (typeof window !== "undefined" && !window.__godinnerGoogleMapsLoaded) {
  window.__godinnerGoogleMapsLoaded = () => {
    window.dispatchEvent(new Event(googleMapsReadyEvent));
  };
}

function formatDistance(distance: number) {
  return Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "Distância indisponível";
}

function markerImage(selected: boolean) {
  const color = selected ? "#f97316" : "#0f2f66";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="62" viewBox="0 0 52 62"><path d="M26 60C21 51 6 39 6 25C6 13.95 14.95 5 26 5s20 8.95 20 20C46 39 31 51 26 60Z" fill="${color}" stroke="white" stroke-width="4"/><circle cx="26" cy="25" r="14" fill="white" fill-opacity=".12"/></svg>`;
  return `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}")`;
}

function createRestaurantMarker({ maps, map, position, restaurant, onSelect }: {
  maps: MapsApi;
  map: MapInstance;
  position: LatLng;
  restaurant: Restaurant;
  onSelect: () => void;
}): MarkerInstance {
  const overlay = new maps.OverlayView();
  const button = document.createElement("button");
  const label = document.createElement("span");
  const text = restaurant.reviewCount > 0 ? restaurant.godinnerRating.toFixed(1) : "novo";

  button.type = "button";
  button.setAttribute("aria-label", `Selecionar ${restaurant.name}`);
  button.title = restaurant.name;
  button.style.position = "absolute";
  button.style.width = "46px";
  button.style.height = "55px";
  button.style.border = "0";
  button.style.padding = "0";
  button.style.background = "center / contain no-repeat";
  button.style.cursor = "pointer";
  button.style.filter = "drop-shadow(0 4px 5px rgb(0 0 0 / .24))";
  button.style.transformOrigin = "50% 100%";
  button.style.transition = "transform 180ms ease, filter 180ms ease";
  label.textContent = text;
  label.style.position = "absolute";
  label.style.inset = "14px 0 auto";
  label.style.color = "white";
  label.style.fontFamily = "system-ui, sans-serif";
  label.style.fontSize = text === "novo" ? "9px" : "11px";
  label.style.fontWeight = "800";
  label.style.textAlign = "center";
  label.style.pointerEvents = "none";
  button.append(label);

  const updateAppearance = (selected: boolean) => {
    button.setAttribute("aria-pressed", String(selected));
    button.style.backgroundImage = markerImage(selected);
    button.style.transform = `translate(-50%, -100%) scale(${selected ? 1.16 : 1})`;
    button.style.zIndex = selected ? "100" : "1";
  };
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    onSelect();
  };
  button.addEventListener("click", handleClick);
  button.addEventListener("mouseenter", () => { button.style.filter = "drop-shadow(0 6px 8px rgb(0 0 0 / .3))"; });
  button.addEventListener("mouseleave", () => { button.style.filter = "drop-shadow(0 4px 5px rgb(0 0 0 / .24))"; });

  overlay.onAdd = () => overlay.getPanes()?.overlayMouseTarget.append(button);
  overlay.draw = () => {
    const pixel = overlay.getProjection().fromLatLngToDivPixel(position);
    if (!pixel) return;
    button.style.left = `${pixel.x}px`;
    button.style.top = `${pixel.y}px`;
  };
  overlay.onRemove = () => {
    button.removeEventListener("click", handleClick);
    button.remove();
  };
  updateAppearance(false);
  overlay.setMap(map);

  return { setMap: (nextMap) => overlay.setMap(nextMap), setSelected: updateAppearance };
}

function MapUnavailable({ missingKey }: { missingKey: boolean }) {
  return <div className="relative grid min-h-[480px] place-items-center overflow-hidden rounded-3xl bg-[#e8f0e4] px-5 text-center ring-1 ring-stone-200 sm:min-h-[560px]">
    <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(35deg,transparent_46%,white_47%,white_52%,transparent_53%),linear-gradient(120deg,transparent_43%,white_44%,white_49%,transparent_50%)] [background-size:180px_180px,240px_240px]" aria-hidden="true"/>
    <div className="relative max-w-sm rounded-3xl bg-white/95 p-6 shadow-xl backdrop-blur">
      <MapPin className="mx-auto text-orange-500" size={30}/>
      <h2 className="mt-3 text-lg font-black">Mapa temporariamente indisponível</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{missingKey && process.env.NODE_ENV === "development" ? "Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para ativar o mapa real neste ambiente." : "Não foi possível carregar o mapa. A lista de restaurantes continua disponível."}</p>
    </div>
  </div>;
}

export function MapView({ restaurants }: { restaurants: Restaurant[] }) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef(new Map<string, MarkerInstance>());
  const [mapsApi, setMapsApi] = useState<MapsApi | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(() => Boolean(globalThis.window?.google?.maps?.importLibrary));
  const [mapFailed, setMapFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(true);
  const mappableRestaurants = useMemo(() => restaurants.filter((restaurant) => hasCoordinates(restaurant.coordinates)), [restaurants]);
  const selected = selectedId ? mappableRestaurants.find((restaurant) => restaurant.id === selectedId) ?? null : null;

  useEffect(() => {
    const markScriptAsLoaded = () => setScriptLoaded(true);
    window.addEventListener(googleMapsReadyEvent, markScriptAsLoaded);
    if (window.google?.maps?.importLibrary) markScriptAsLoaded();
    return () => window.removeEventListener(googleMapsReadyEvent, markScriptAsLoaded);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || mapsApi) return;
    const loader = window.google?.maps?.importLibrary;
    if (!loader) return;
    void Promise.all([loader("maps"), loader("core")])
      .then(([maps, core]) => {
        const api = { ...core, ...maps } as MapsApi;
        if (!api.Map || !api.LatLngBounds || !api.OverlayView) throw new Error("Google Maps incompleto");
        setMapsApi(api);
      })
      .catch(() => setMapFailed(true));
  }, [mapsApi, scriptLoaded]);

  useEffect(() => {
    if (!mapsApi || !mapElementRef.current || mapRef.current) return;
    mapRef.current = new mapsApi.Map(mapElementRef.current, {
      center: defaultCenter,
      zoom: 12,
      backgroundColor: "#e8f0e4",
      clickableIcons: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true,
      styles: [
        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "simplified" }] },
      ],
    });
  }, [mapsApi]);

  const fitResults = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapsApi || !mappableRestaurants.length) return;
    if (mappableRestaurants.length === 1) {
      const coordinates = mappableRestaurants[0].coordinates!;
      map.panTo({ lat: coordinates.latitude, lng: coordinates.longitude });
      map.setZoom(15);
      return;
    }
    const bounds = new mapsApi.LatLngBounds();
    mappableRestaurants.forEach((restaurant) => bounds.extend({ lat: restaurant.coordinates!.latitude, lng: restaurant.coordinates!.longitude }));
    map.fitBounds(bounds, { top: 72, right: 48, bottom: 150, left: 48 });
    const listener = map.addListener("idle", () => {
      if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
      listener.remove();
    });
  }, [mapsApi, mappableRestaurants]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapsApi || !map) return;

    const markers = new Map<string, MarkerInstance>();
    markersRef.current = markers;

    mappableRestaurants.forEach((restaurant) => {
      const position = { lat: restaurant.coordinates!.latitude, lng: restaurant.coordinates!.longitude };
      const marker = createRestaurantMarker({
        maps: mapsApi,
        map,
        position,
        restaurant,
        onSelect: () => {
          setSelectedId(restaurant.id);
          setCardOpen(true);
          map.panTo(position);
        },
      });
      markers.set(restaurant.id, marker);
    });
    fitResults();

    return () => {
      markers.forEach((marker) => {
        marker.setMap(null);
      });
      markers.clear();
      if (markersRef.current === markers) markersRef.current = new Map();
    };
  }, [fitResults, mapsApi, mappableRestaurants]);

  useEffect(() => {
    markersRef.current.forEach((marker, restaurantId) => {
      marker.setSelected(restaurantId === selected?.id);
    });
  }, [mappableRestaurants, selected?.id]);

  if (!mappableRestaurants.length) return <MapUnavailable missingKey={false}/>;

  return <div className="relative h-[min(72svh,620px)] min-h-[480px] overflow-hidden rounded-3xl bg-[#e8f0e4] shadow-inner ring-1 ring-stone-200 sm:h-[min(70svh,680px)] sm:min-h-[560px] lg:h-[min(76vh,760px)] lg:min-h-[620px]">
    {googleMapsApiKey && <Script
      id="godinner-google-maps"
      src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&v=weekly&language=pt-BR&region=BR&loading=async&callback=__godinnerGoogleMapsLoaded&auth_referrer_policy=origin`}
      strategy="afterInteractive"
      onError={() => setMapFailed(true)}
    />}
    {!googleMapsApiKey || mapFailed ? <MapUnavailable missingKey={!googleMapsApiKey}/> : <>
      <div ref={mapElementRef} className="absolute inset-0" aria-label="Mapa dos restaurantes"/>
      {!mapsApi && <div className="absolute inset-0 z-10 grid place-items-center bg-[#e8f0e4]"><div className="rounded-2xl bg-white/95 px-5 py-4 text-center shadow-lg"><LoaderCircle className="mx-auto animate-spin text-orange-500"/><p className="mt-2 text-sm font-bold">Carregando mapa…</p></div></div>}
      {mapsApi && <button type="button" onClick={fitResults} aria-label="Mostrar todos os restaurantes no mapa" className="absolute right-3 top-3 z-20 grid min-h-11 min-w-11 place-items-center rounded-full bg-white text-stone-800 shadow-lg ring-1 ring-stone-200 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"><LocateFixed size={19}/></button>}
      {mapsApi && selected && cardOpen && <div className="absolute left-3 right-3 top-3 z-20 mx-auto max-w-sm rounded-2xl bg-white p-2.5 shadow-2xl ring-1 ring-stone-200 sm:left-5 sm:right-auto sm:top-5 sm:w-[350px] sm:max-w-none">
        <button type="button" onClick={() => setCardOpen(false)} aria-label="Fechar detalhes do restaurante" className="absolute right-1.5 top-1.5 z-20 grid min-h-9 min-w-9 place-items-center rounded-full bg-white/95 text-stone-700 shadow-sm transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"><X size={17}/></button>
        <Link href={`/restaurant/${selected.slug}`} aria-label={`Abrir ${selected.name}`} className="group flex items-center gap-2.5 pr-9">
          <span className="relative h-[76px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-20 sm:w-24">
            {selected.hasGooglePlaceCover ? <GooglePlaceCover slug={selected.slug} fallbackUrl={selected.coverPhoto.url} alt={selected.name} variant="card" priority/> : <Image src={selected.coverPhoto.url} alt={selected.name} fill sizes="96px" className="object-cover"/>}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate pr-1 text-sm text-stone-950 sm:text-base">{selected.name}</b>
            <span className="mt-0.5 block truncate text-xs text-stone-500 sm:text-sm">{selected.neighborhood} · {selected.cuisine[0]}</span>
            <span className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-stone-600 sm:text-xs"><span className="rounded-full bg-stone-950 px-2 py-1 text-white">{selected.reviewCount > 0 ? selected.godinnerRating.toFixed(1) : "novo"}</span>{selected.priceRange && <>{selected.priceRange} · </>}{formatDistance(selected.distanceKm)}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-black text-orange-600 transition group-hover:text-orange-700">Abrir restaurante <ArrowUpRight size={14}/></span>
          </span>
        </Link>
      </div>}
    </>}
  </div>;
}
