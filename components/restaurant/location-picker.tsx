"use client";

import Script from "next/script";
import { MapPin, Navigation, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RestaurantCoordinates } from "@/types";

type City = "Belo Horizonte" | "Nova Lima";
type LatLng = { lat: number; lng: number };
type LatLngValue = { lat: () => number; lng: () => number };
type Listener = { remove: () => void };
type LocationMapInstance = { panTo: (position: LatLng) => void; setZoom: (zoom: number) => void; addListener: (event: "click", callback: (event: { latLng?: LatLngValue }) => void) => Listener };
type LocationMarkerInstance = { setPosition: (position: LatLng) => void; setVisible: (visible: boolean) => void; setMap: (map: LocationMapInstance | null) => void; addListener: (event: "dragend", callback: () => void) => Listener; getPosition: () => LatLngValue | undefined };
type GeocoderResult = { formatted_address: string; address_components?: Array<{ long_name: string; types: string[] }> };
type LocationMapsApi = { Map: new (element: HTMLElement, options: Record<string, unknown>) => LocationMapInstance; Marker: new (options: Record<string, unknown>) => LocationMarkerInstance; Geocoder: new () => { geocode: (request: { location: LatLng }, callback: (results: GeocoderResult[] | null, status: string) => void) => void } };

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const defaultCenter = { lat: -19.946, lng: -43.938 };
const getMaps = () => (window as unknown as { google?: { maps: LocationMapsApi } }).google?.maps;

function parseAddress(result: GeocoderResult) {
  const components = result.address_components ?? [];
  const get = (...types: string[]) => components.find((item) => types.some((type) => item.types.includes(type)))?.long_name;
  const cityName = get("locality", "administrative_area_level_2")?.toLowerCase();
  const city: City | undefined = cityName?.includes("nova lima") ? "Nova Lima" : cityName?.includes("belo horizonte") ? "Belo Horizonte" : undefined;
  return { address: result.formatted_address, city, neighborhood: get("neighborhood", "sublocality_level_1", "sublocality") };
}

export function LocationPicker({ value, onChange, onAddressResolved }: { value?: RestaurantCoordinates; onChange: (coordinates: RestaurantCoordinates) => void; onAddressResolved: (value: { address: string; city?: City; neighborhood?: string }) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LocationMapInstance | null>(null);
  const marker = useRef<LocationMarkerInstance | null>(null);
  const listeners = useRef<Listener[]>([]);
  const lastResolved = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(() => Boolean(typeof window !== "undefined" && getMaps()));
  const [message, setMessage] = useState<string | null>(null);

  const resolveAddress = useCallback((coordinates: RestaurantCoordinates) => {
    const maps = getMaps();
    if (!maps) return;
    const key = `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
    if (lastResolved.current === key) return;
    lastResolved.current = key;
    new maps.Geocoder().geocode({ location: { lat: coordinates.latitude, lng: coordinates.longitude } }, (results, status) => {
      if (status === "OK" && results?.[0]) { onAddressResolved(parseAddress(results[0])); setMessage("Endereço, bairro e cidade foram preenchidos. Confira os dados antes de continuar."); }
      else setMessage("Pin marcado. Complete o endereço manualmente se ele não for preenchido.");
    });
  }, [onAddressResolved]);

  const select = useCallback((coordinates: RestaurantCoordinates, resolve = true) => {
    onChange(coordinates);
    marker.current?.setPosition({ lat: coordinates.latitude, lng: coordinates.longitude });
    marker.current?.setVisible(true);
    map.current?.panTo({ lat: coordinates.latitude, lng: coordinates.longitude });
    if (resolve) resolveAddress(coordinates);
  }, [onChange, resolveAddress]);

  useEffect(() => {
    if (!open || !ready || !element.current || map.current || !getMaps()) return;
    const maps = getMaps()!;
    const initial = value ? { lat: value.latitude, lng: value.longitude } : defaultCenter;
    const instance = new maps.Map(element.current, { center: initial, zoom: value ? 16 : 12, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false });
    map.current = instance;
    marker.current = new maps.Marker({ map: instance, position: initial, draggable: true, visible: Boolean(value), title: "Localização do restaurante" });
    listeners.current = [
      instance.addListener("click", (event) => { if (event.latLng) select({ latitude: event.latLng.lat(), longitude: event.latLng.lng() }); }),
      marker.current.addListener("dragend", () => { const position = marker.current?.getPosition(); if (position) select({ latitude: position.lat(), longitude: position.lng() }); }),
    ];
    return () => { listeners.current.forEach((listener) => listener.remove()); marker.current?.setMap(null); listeners.current = []; marker.current = null; map.current = null; };
  }, [open, ready, select, value]);

  useEffect(() => {
    if (ready && value) resolveAddress(value);
  }, [ready, resolveAddress, value]);

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage("Localização indisponível. Marque o pin ou informe o endereço manualmente."); return; }
    setMessage("Buscando sua localização…");
    navigator.geolocation.getCurrentPosition(
      (position) => { setOpen(true); setMessage("Localização encontrada. Ajuste o pin se necessário."); select({ latitude: position.coords.latitude, longitude: position.coords.longitude }); },
      (error) => { const text = error.code === error.PERMISSION_DENIED ? "Permissão de localização negada." : error.code === error.TIMEOUT ? "A localização demorou demais para responder." : "Não foi possível obter sua localização."; setMessage(`${text} Você pode marcar o local no mapa ou preencher manualmente.`); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
    {open && apiKey && !ready && <Script id="godinner-location-picker-maps" src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=pt-BR&region=BR`} strategy="afterInteractive" onLoad={() => setReady(true)} onError={() => setMessage("Não foi possível carregar o mapa. Informe o endereço manualmente.")}/>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Localização</p><p className="text-sm text-stone-600">Use sua localização ou marque o pin para preencher o endereço.</p></div>{open && <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-bold shadow-sm"><X size={16}/> Fechar mapa</button>}</div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={useLocation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white"><Navigation size={16}/> Usar minha localização</button><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold"><MapPin size={16} className="text-orange-500"/> Selecionar no mapa</button></div>
    {message && <p role="status" className="mt-3 text-sm text-stone-600">{message}</p>}
    {open && <div className="relative mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">{apiKey ? <><div ref={element} className="h-72 w-full" aria-label="Mapa para selecionar a localização do restaurante"/><p className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow">Toque no mapa para posicionar o pin</p></> : <div className="grid h-48 place-items-center p-5 text-center text-sm text-stone-600">Mapa indisponível neste ambiente. Você pode preencher o endereço manualmente.</div>}</div>}
  </section>;
}
