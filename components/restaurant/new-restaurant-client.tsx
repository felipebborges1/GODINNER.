"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { LocationPicker } from "@/components/restaurant/location-picker";
import { ReviewForm } from "@/components/review/review-form";
import { useAppContext } from "@/hooks/use-app-context";
import type { PriceRange, Restaurant, RestaurantCoordinates } from "@/types";

export function NewRestaurantClient() {
  const query = useSearchParams();
  const { submitRestaurant } = useAppContext();
  const [name, setName] = useState(query.get("name") ?? "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState<"Belo Horizonte" | "Nova Lima">("Belo Horizonte");
  const [neighborhood, setNeighborhood] = useState("");
  const [coordinates, setCoordinates] = useState<RestaurantCoordinates>();
  const [created, setCreated] = useState<Restaurant | null>(null);
  const [duplicate, setDuplicate] = useState<Restaurant | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Informe um nome válido.";
    if (!address.trim()) next.address = "Informe o endereço.";
    if (!neighborhood.trim()) next.neighborhood = "Informe o bairro.";
    setErrors(next);
    if (Object.keys(next).length || busy.current) return;
    busy.current = true;
    setIsSubmitting(true);
    const result = await submitRestaurant({ name, address, city, neighborhood, category: "restaurant", cuisine: ["Não informada"], priceRange: "$$" as PriceRange, coordinates });
    busy.current = false;
    setIsSubmitting(false);
    if (result.duplicate) { setDuplicate(result.duplicate); return; }
    if (result.error) { setErrors({ submit: result.error }); return; }
    if (result.restaurant) setCreated(result.restaurant);
  };

  if (created) return <ReviewForm restaurant={created}/>;

  return <main className="mx-auto max-w-2xl px-4 py-8 pb-28">
    <form onSubmit={submit} className="space-y-5">
      <div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="mt-1 text-3xl font-black">Onde você foi?</h1><p className="mt-2 text-sm text-stone-600">Informe o lugar. Em seguida você registra sua review, com texto e fotos do que comeu.</p></div>
      {duplicate && <div className="rounded-2xl bg-orange-50 p-4 text-sm"><b>Este lugar já existe no GODINNER.</b><Link href={`/review/new?restaurant=${duplicate.slug}`} className="mt-2 block font-bold text-orange-700">Registrar experiência em {duplicate.name}</Link></div>}
      <Field label="Nome do restaurante" error={errors.name}><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <LocationPicker value={coordinates} onChange={setCoordinates} onAddressResolved={(result) => { setAddress(result.address); if (result.city) setCity(result.city); if (result.neighborhood) setNeighborhood(result.neighborhood); }} />
      <Field label="Endereço" error={errors.address}><input className="input" value={address} onChange={(event) => setAddress(event.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Cidade"><select className="input" value={city} onChange={(event) => setCity(event.target.value as typeof city)}><option>Belo Horizonte</option><option>Nova Lima</option></select></Field><Field label="Bairro" error={errors.neighborhood}><input className="input" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} /></Field></div>
      <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">O GODINNER completa os demais dados do lugar antes de validá-lo. Agora, o mais importante é a sua experiência.</p>
      {errors.submit && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.submit}</p>}
      <button disabled={isSubmitting} className="w-full rounded-2xl bg-orange-500 py-4 font-black text-white disabled:opacity-60">{isSubmitting ? "Preparando sua review…" : "Continuar para minha review"}</button>
    </form>
  </main>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block font-bold">{label}</span>{children}{error && <span className="mt-2 block text-sm font-semibold text-red-600">{error}</span>}</label>;
}
