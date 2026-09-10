"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { LocationPicker } from "@/components/restaurant/location-picker";
import { ReviewForm } from "@/components/review/review-form";
import { useAppContext } from "@/hooks/use-app-context";
import type { Restaurant, RestaurantCoordinates } from "@/types";

type MapReviewDraft = { name: string; address: string; city: string; neighborhood: string; region: string; country: string; coordinates?: RestaurantCoordinates; area: string; center?: RestaurantCoordinates };
const draftStorageKey = "godinner.review.map-draft.v1";

function coordinatesFromParams(params: ReturnType<typeof useSearchParams>) {
  const latitude = Number(params.get("centerLat"));
  const longitude = Number(params.get("centerLng"));
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : undefined;
}

function initialDraft(params: ReturnType<typeof useSearchParams>): MapReviewDraft {
  return { name: params.get("name")?.trim() ?? "", address: "", city: "", neighborhood: "", region: "", country: "", area: params.get("area")?.trim() ?? "", center: coordinatesFromParams(params) };
}

function savedDraft(value: string | null): MapReviewDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<MapReviewDraft>;
    if (!parsed.name) return null;
    return { name: parsed.name, address: parsed.address ?? "", city: parsed.city ?? "", neighborhood: parsed.neighborhood ?? "", region: parsed.region ?? "", country: parsed.country ?? "", coordinates: parsed.coordinates, area: parsed.area ?? "", center: parsed.center };
  } catch { return null; }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block font-bold">{label}</span>{children}{error && <span className="mt-2 block text-sm font-semibold text-red-600">{error}</span>}</label>;
}

export function MapReviewClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { currentUserId, submitRestaurant } = useAppContext();
  const [draft, setDraft] = useState<MapReviewDraft>(() => initialDraft(params));
  const [edited, setEdited] = useState({ address: false, city: false, neighborhood: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (params.get("resume") !== "map") return;
    const restored = savedDraft(window.sessionStorage.getItem(draftStorageKey));
    window.sessionStorage.removeItem(draftStorageKey);
    if (restored) queueMicrotask(() => setDraft(restored));
    router.replace("/review/map");
  }, [params, router]);

  const update = <K extends keyof MapReviewDraft>(key: K, value: MapReviewDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const onAddressResolved = (result: { address: string; city?: string; neighborhood?: string; region?: string; country?: string }) => {
    setDraft((current) => ({
      ...current,
      address: edited.address ? current.address : result.address,
      city: edited.city ? current.city : result.city ?? current.city,
      neighborhood: edited.neighborhood ? current.neighborhood : result.neighborhood ?? current.neighborhood,
      region: result.region ?? current.region,
      country: result.country ?? current.country,
    }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = "Informe o nome do lugar.";
    if (!draft.address.trim()) next.address = "Informe o endereço.";
    if (!draft.city.trim()) next.city = "Informe a cidade.";
    if (!draft.coordinates) next.coordinates = "Marque a localização no mapa para continuar.";
    setErrors(next);
    if (Object.keys(next).length || submittingRef.current) return;
    if (!currentUserId) { window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft)); setLoginOpen(true); return; }
    submittingRef.current = true; setSubmitting(true);
    const result = await submitRestaurant({ name: draft.name, address: draft.address, city: draft.city, neighborhood: draft.neighborhood, category: "restaurant", cuisine: ["Não informada"], priceRange: null, coordinates: draft.coordinates });
    submittingRef.current = false; setSubmitting(false);
    if (result.duplicate) { setRestaurant(result.duplicate); return; }
    if (result.error) { setErrors({ submit: result.error }); return; }
    if (result.restaurant) setRestaurant(result.restaurant);
  };

  if (restaurant) return <ReviewForm restaurant={restaurant}/>;
  return <main className="mx-auto max-w-2xl px-4 py-8 pb-28"><form onSubmit={submit} className="space-y-5"><button type="button" onClick={() => router.back()} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft size={17}/> Voltar</button><div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="mt-1 text-3xl font-black">Onde fica o lugar?</h1><p className="mt-2 text-sm leading-6 text-stone-600">Posicione o pino na entrada do restaurante e confira os dados antes de escrever sua avaliação.</p></div><Field label="Nome do lugar" error={errors.name}><input className="input" value={draft.name} onChange={(event) => update("name", event.target.value)} autoFocus/></Field><LocationPicker value={draft.coordinates} initialCenter={draft.center} initialArea={draft.area} onChange={(coordinates) => update("coordinates", coordinates)} onAddressResolved={onAddressResolved}/><Field label="Endereço" error={errors.address}><input className="input" value={draft.address} onChange={(event) => { setEdited((current) => ({ ...current, address: true })); update("address", event.target.value); }}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Cidade" error={errors.city}><input className="input" value={draft.city} onChange={(event) => { setEdited((current) => ({ ...current, city: true })); update("city", event.target.value); }}/></Field><Field label="Bairro (opcional)"><input className="input" value={draft.neighborhood} onChange={(event) => { setEdited((current) => ({ ...current, neighborhood: true })); update("neighborhood", event.target.value); }}/></Field></div>{(draft.region || draft.country) && <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">{[draft.region, draft.country].filter(Boolean).join(" · ")}</p>}{errors.coordinates && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.coordinates}</p>}{errors.submit && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.submit}</p>}<button disabled={submitting} className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white disabled:opacity-60">{submitting ? "Preparando sua avaliação…" : "Confirmar local e avaliar"}</button><p className="text-center text-xs leading-5 text-stone-500">O local só é enviado para análise nesta confirmação. Sem pino, o fluxo atual não pode continuar porque a localização é obrigatória para a moderação.</p></form><LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next="/review/map?resume=map"/></main>;
}
