"use client";

import { MapPin, Navigation, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { googleMapsLoader, loadMapsLibraries, type MapsFailure } from "@/lib/google-maps-loader";
import { parseRestaurantAddress, type GoogleGeocoderResult } from "@/lib/restaurant-location";
import type { RestaurantCoordinates } from "@/types";

type LatLng = { lat: number; lng: number };
type LatLngValue = { lat: () => number; lng: () => number };
type Listener = { remove: () => void };
type LocationMapInstance = { panTo: (position: LatLng) => void; addListener: (event: "click", callback: (event: { latLng?: LatLngValue }) => void) => Listener };
type LocationMarkerInstance = { setPosition: (position: LatLng) => void; setVisible: (visible: boolean) => void; setMap: (map: LocationMapInstance | null) => void; addListener: (event: "dragend", callback: () => void) => Listener; getPosition: () => LatLngValue | undefined };
type LocationMapsApi = { Map: new (element: HTMLElement, options: Record<string, unknown>) => LocationMapInstance; Marker: new (options: Record<string, unknown>) => LocationMarkerInstance };
type GeocoderApi = { Geocoder: new () => { geocode: (request: { location: LatLng }, callback: (results: GoogleGeocoderResult[] | null, status: string) => void) => void } };
type ResolvedAddress = { address: string; city?: string; neighborhood?: string; region?: string; country?: string };
const defaultCenter = { lat: -19.946, lng: -43.938 };
const addressFailure = "Não foi possível preencher o endereço. As coordenadas selecionadas foram mantidas. Complete os campos manualmente.";

export function LocationPicker({ value, onChange, onAddressResolved }: { value?: RestaurantCoordinates; onChange: (coordinates: RestaurantCoordinates) => void; onAddressResolved: (value: ResolvedAddress) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LocationMapInstance | null>(null);
  const marker = useRef<LocationMarkerInstance | null>(null);
  const callbacks = useRef({ onChange, onAddressResolved });
  const selected = useRef(value);
  const selectionVersion = useRef(0);
  const addressVersion = useRef(0);
  const locationPending = useRef(false);
  const mounted = useRef(false);
  const [open, setOpen] = useState(false);
  const [mapsApi, setMapsApi] = useState<LocationMapsApi | null>(null);
  const [mapFailure, setMapFailure] = useState<MapsFailure | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [addressMessage, setAddressMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => { callbacks.current = { onChange, onAddressResolved }; }, [onChange, onAddressResolved]);
  useEffect(() => {
    const selection = selectionVersion;
    const address = addressVersion;
    mounted.current = true;
    return () => { mounted.current = false; selection.current++; address.current++; };
  }, []);

  const resolveAddress = useCallback(async (coordinates: RestaurantCoordinates) => {
    const attempt = ++addressVersion.current;
    setAddressMessage("Preenchendo endereço…");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isCurrent = () => mounted.current && attempt === addressVersion.current;
    try {
      // Address resolution is independent of displaying the map. A failure
      // must not remove the selected point or hide an otherwise working map.
      const api = await loadMapsLibraries(["geocoding"]) as GeocoderApi;
      if (!isCurrent()) return;
      timer = setTimeout(() => {
        if (isCurrent()) { addressVersion.current++; setAddressMessage(addressFailure); }
      }, 10_000);
      new api.Geocoder().geocode({ location: { lat: coordinates.latitude, lng: coordinates.longitude } }, (results, status) => {
        clearTimeout(timer);
        if (!isCurrent()) return;
        if (status === "OK" && results?.[0]) {
          callbacks.current.onAddressResolved(parseRestaurantAddress(results[0]));
          setAddressMessage("Endereço preenchido. Confira os dados antes de continuar.");
        } else setAddressMessage(addressFailure);
      });
    } catch {
      clearTimeout(timer);
      if (isCurrent()) setAddressMessage(addressFailure);
    }
  }, []);

  const select = useCallback((coordinates: RestaurantCoordinates) => {
    selectionVersion.current++;
    selected.current = coordinates;
    callbacks.current.onChange(coordinates);
    marker.current?.setPosition({ lat: coordinates.latitude, lng: coordinates.longitude });
    marker.current?.setVisible(true);
    map.current?.panTo({ lat: coordinates.latitude, lng: coordinates.longitude });
    void resolveAddress(coordinates);
  }, [resolveAddress]);

  useEffect(() => {
    if (value?.latitude !== selected.current?.latitude || value?.longitude !== selected.current?.longitude) {
      // Restored drafts/manual choices supersede pending GPS/address results.
      selectionVersion.current++;
      addressVersion.current++;
      selected.current = value;
      marker.current?.setVisible(Boolean(value));
      if (value) {
        const point = { lat: value.latitude, lng: value.longitude };
        marker.current?.setPosition(point);
        map.current?.panTo(point);
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const unsubscribe = googleMapsLoader().subscribe((failure) => { if (active) setMapFailure(failure); });
    void loadMapsLibraries(["maps", "marker"]).then((libraries) => {
      const api = libraries as LocationMapsApi;
      if (!api.Map || !api.Marker) throw new Error("Maps unavailable");
      if (active) setMapsApi((current) => current ?? api);
    }).catch(() => { if (active) setMapFailure((current) => current ?? "network"); });
    return () => { active = false; unsubscribe(); };
  }, [open]);

  useEffect(() => {
    if (!open || !mapsApi || mapFailure || !element.current) return;
    const coordinates = selected.current;
    const initial = coordinates ? { lat: coordinates.latitude, lng: coordinates.longitude } : defaultCenter;
    const listeners: Listener[] = [];
    try {
      const instance = new mapsApi.Map(element.current, { center: initial, zoom: coordinates ? 16 : 12, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false });
      map.current = instance;
      marker.current = new mapsApi.Marker({ map: instance, position: initial, draggable: true, visible: Boolean(coordinates), title: "Localização do restaurante" });
      listeners.push(instance.addListener("click", (event) => {
        if (event.latLng) select({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
      }), marker.current.addListener("dragend", () => {
        const point = marker.current?.getPosition();
        if (point) select({ latitude: point.lat(), longitude: point.lng() });
      }));
    } catch { queueMicrotask(() => { if (mounted.current) setMapFailure("unavailable"); }); }
    return () => {
      listeners.forEach((listener) => listener.remove());
      marker.current?.setMap(null);
      marker.current = null;
      map.current = null;
    };
  }, [open, mapsApi, mapFailure, select]);

  const useLocation = () => {
    if (locationPending.current) return;
    if (!navigator.geolocation) { setLocationMessage("Posição indisponível neste navegador. Você pode selecionar o local no mapa."); return; }
    const version = selectionVersion.current;
    locationPending.current = true;
    setLocating(true);
    setLocationMessage("Buscando sua localização…");
    const finish = () => { locationPending.current = false; if (mounted.current) setLocating(false); };
    const accept = () => {
      if (!mounted.current) return false;
      if (version !== selectionVersion.current) {
        setLocationMessage("O local escolhido manualmente foi mantido.");
        return false;
      }
      return true;
    };
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          finish();
          if (!accept()) return;
          setOpen(true);
          setLocationMessage("Localização encontrada. Confira o local selecionado.");
          select({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (error) => {
          finish();
          if (!accept()) return;
          const text = error.code === 1 ? "Permissão de localização negada." : error.code === 3 ? "A localização demorou demais para responder (timeout)." : "Posição indisponível neste momento.";
          setLocationMessage(`${text} Você pode selecionar o local no mapa, sem usar o GPS.`);
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
      );
    } catch { finish(); if (accept()) setLocationMessage("Não foi possível solicitar sua posição neste navegador. Selecione o local no mapa."); }
  };

  return <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black">Localização</p><p className="text-sm text-stone-600">Use sua localização ou marque o pin para preencher o endereço.</p></div>{open && <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3 text-sm font-bold shadow-sm"><X size={16}/> Fechar mapa</button>}</div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={locating} onClick={useLocation} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-60"><Navigation size={16}/> {locating ? "Buscando localização…" : "Usar minha localização"}</button><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-bold"><MapPin size={16} className="text-orange-500"/> Selecionar no mapa</button></div>
    {locationMessage && <p role="status" data-stage="location" className="mt-3 text-sm text-stone-600">{locationMessage}</p>}
    {addressMessage && <p role="status" data-stage="address" className="mt-3 text-sm text-stone-600">{addressMessage}</p>}
    {open && <div className="relative mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {mapFailure ? <div role="alert" data-stage="map" className="p-5 text-sm text-stone-700"><p className="font-bold">Não foi possível carregar o mapa.</p><p className="mt-2">{mapFailure === "authorization" ? "O serviço de mapas não autorizou o acesso neste site. Isso não é uma falha do GPS. Não é necessário tentar obter sua localização novamente." : "O serviço de mapas está indisponível. Isso não indica uma falha do GPS."}</p><p className="mt-2">Os dados preenchidos foram mantidos. Sem um ponto selecionado, será necessário voltar quando o mapa estiver disponível para confirmar o local.</p></div> : <>
        <div ref={element} className="h-72 w-full" aria-label="Mapa para selecionar a localização do restaurante"/>
        {!mapsApi ? <p role="status" className="absolute inset-0 grid place-items-center bg-white">Carregando mapa…</p> : <p className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold shadow">Toque no mapa para posicionar o pin</p>}
      </>}
    </div>}
  </section>;
}
