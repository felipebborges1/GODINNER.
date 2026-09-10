"use client";

import Script from "next/script";
import { MapPin, Navigation, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseRestaurantAddress, type GoogleGeocoderResult } from "@/lib/restaurant-location";
import type { RestaurantCoordinates } from "@/types";

type LatLng = { lat: number; lng: number };
type LatLngValue = { lat: () => number; lng: () => number };
type Listener = { remove: () => void };
type LocationMapInstance = { panTo: (position: LatLng) => void; setZoom: (zoom: number) => void; addListener: (event: "click", callback: (event: { latLng?: LatLngValue }) => void) => Listener };
type LocationMarkerInstance = { setPosition: (position: LatLng) => void; setVisible: (visible: boolean) => void; setMap: (map: LocationMapInstance | null) => void; addListener: (event: "dragend", callback: () => void) => Listener; getPosition: () => LatLngValue | undefined };
type GeocodedResult = GoogleGeocoderResult & { geometry?: { location?: LatLngValue } };
type LocationMapsApi = { Map: new (element: HTMLElement, options: Record<string, unknown>) => LocationMapInstance; Marker: new (options: Record<string, unknown>) => LocationMarkerInstance; Geocoder: new () => { geocode: (request: { location?: LatLng; address?: string }, callback: (results: GeocodedResult[] | null, status: string) => void) => void } };

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const getMaps = () => (window as unknown as { google?: { maps: LocationMapsApi } }).google?.maps;

export function LocationPicker({ value, initialCenter, initialArea, onChange, onAddressResolved }: { value?: RestaurantCoordinates; initialCenter?: RestaurantCoordinates; initialArea?: string; onChange: (coordinates: RestaurantCoordinates) => void; onAddressResolved: (value: { address: string; city?: string; neighborhood?: string; region?: string; country?: string }) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LocationMapInstance | null>(null);
  const marker = useRef<LocationMarkerInstance | null>(null);
  const listeners = useRef<Listener[]>([]);
  const lastResolved = useRef<string | null>(null);
  const resolveVersion = useRef(0);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(() => Boolean(typeof window !== "undefined" && getMaps()));
  const [message, setMessage] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<RestaurantCoordinates | null>(() => value ?? initialCenter ?? null);

  const resolveAddress = useCallback((coordinates: RestaurantCoordinates) => {
    const maps = getMaps();
    if (!maps) return;
    const key = `${coordinates.latitude.toFixed(6)},${coordinates.longitude.toFixed(6)}`;
    if (lastResolved.current === key) return;
    lastResolved.current = key;
    const version = ++resolveVersion.current;
    new maps.Geocoder().geocode({ location: { lat: coordinates.latitude, lng: coordinates.longitude } }, (results, status) => {
      if (version !== resolveVersion.current) return;
      if (status === "OK" && results?.[0]) { onAddressResolved(parseRestaurantAddress(results[0])); setMessage("Endereço sugerido preenchido. Confira os dados antes de continuar."); }
      else setMessage("Não conseguimos preencher o endereço automaticamente. Você pode completar os campos manualmente.");
    });
  }, [onAddressResolved]);

  const select = useCallback((coordinates: RestaurantCoordinates, resolve = true) => {
    onChange(coordinates);
    marker.current?.setPosition({ lat: coordinates.latitude, lng: coordinates.longitude });
    marker.current?.setVisible(true);
    setMapCenter(coordinates);
    map.current?.panTo({ lat: coordinates.latitude, lng: coordinates.longitude });
    if (resolve) resolveAddress(coordinates);
  }, [onChange, resolveAddress]);

  useEffect(() => {
    if (!open || !ready || mapCenter || !initialArea || !getMaps()) return;
    const expectedArea = initialArea;
    new (getMaps()!).Geocoder().geocode({ address: expectedArea }, (results, status) => {
      if (status !== "OK" || !results?.[0] || initialArea !== expectedArea) {
        setMessage("Não conseguimos centralizar o mapa nessa região. Informe cidade ou endereço para continuar.");
        return;
      }
      const location = results[0].geometry?.location;
      if (!location) return;
      setMapCenter({ latitude: location.lat(), longitude: location.lng() });
      setMessage("Mapa centralizado na região da sua busca. Posicione o pino na entrada do lugar.");
    });
  }, [initialArea, mapCenter, open, ready]);

  useEffect(() => {
    if (!open || !ready || !element.current || map.current || !getMaps()) return;
    const maps = getMaps()!;
    if (!mapCenter) return;
    const initial = { lat: mapCenter.latitude, lng: mapCenter.longitude };
    const instance = new maps.Map(element.current, { center: initial, zoom: value ? 16 : 12, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: "greedy" });
    map.current = instance;
    marker.current = new maps.Marker({ map: instance, position: initial, draggable: true, visible: Boolean(value), title: "Localização do restaurante" });
    listeners.current = [
      instance.addListener("click", (event) => { if (event.latLng) select({ latitude: event.latLng.lat(), longitude: event.latLng.lng() }); }),
      marker.current.addListener("dragend", () => { const position = marker.current?.getPosition(); if (position) select({ latitude: position.lat(), longitude: position.lng() }); }),
    ];
    return () => { listeners.current.forEach((listener) => listener.remove()); marker.current?.setMap(null); listeners.current = []; marker.current = null; map.current = null; };
  }, [mapCenter, open, ready, select, value]);

  useEffect(() => {
    if (ready && value) resolveAddress(value);
  }, [ready, resolveAddress, value]);

  const useLocation = () => {
    if (!navigator.geolocation) { setMessage("Localização indisponível. Marque o pin ou informe o endereço manualmente."); return; }
    setMessage("Buscando sua localização…");
    navigator.geolocation.getCurrentPosition(
      (position) => { const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }; setMapCenter(next); setOpen(true); setMessage("Mapa centralizado na sua localização. Ajuste o pino até a entrada do lugar."); },
      (error) => { const text = error.code === error.PERMISSION_DENIED ? "Permissão de localização negada." : error.code === error.TIMEOUT ? "A localização demorou demais para responder." : "Não foi possível obter sua localização."; setMessage(`${text} Você pode marcar o local no mapa ou preencher manualmente.`); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
    {open && apiKey && !ready && <Script id="godinner-location-picker-maps" src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=pt-BR`} strategy="afterInteractive" onLoad={() => setReady(true)} onError={() => setMessage("Não foi possível carregar o mapa. Informe o endereço manualmente.")}/>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Onde fica o lugar?</p><p className="text-sm text-stone-600">Posicione o pino na entrada do restaurante.</p></div>{open && <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-bold shadow-sm"><X size={16}/> Fechar mapa</button>}</div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={useLocation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white"><Navigation size={16}/> Usar minha localização</button><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold"><MapPin size={16} className="text-orange-500"/> Selecionar no mapa</button></div>
    {message && <p role="status" className="mt-3 text-sm text-stone-600">{message}</p>}
    {open && <div className="relative mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">{apiKey ? mapCenter ? <><div ref={element} className="h-72 w-full" aria-label="Mapa para selecionar a localização do restaurante"/><p className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow">Toque no mapa para posicionar o pino</p></> : <div className="grid h-48 place-items-center p-5 text-center text-sm text-stone-600">Informe uma cidade ou endereço para abrir o mapa nesta região.</div> : <div className="grid h-48 place-items-center p-5 text-center text-sm text-stone-600">Mapa indisponível neste ambiente. Você pode preencher o endereço manualmente.</div>}</div>}
  </section>;
}
