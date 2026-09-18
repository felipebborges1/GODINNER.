"use client";

import { useState } from "react";
import { PhotoUploader } from "@/components/review/photo-uploader";
import { useAppContext } from "@/hooks/use-app-context";
import { getCurrencyForCountry } from "@/lib/currency";
import { createGeneralRatingDetails, getCriteriaCount, getRatingDetailsScore, getTopicScore, type ReviewRatingDetails } from "@/lib/review-criteria";
import { formatRating, isDimensionRating } from "@/lib/review-rating";
import type { Restaurant, RestaurantPhoto, Review } from "@/types";
import { DetailedRatingInput } from "./detailed-rating-input";

const today = () => new Date().toISOString().slice(0, 10);

export function ReviewEditForm({ review, restaurant, onComplete, onCancel }: { review: Review; restaurant: Restaurant; onComplete: () => void; onCancel: () => void }) {
  const { updateReview } = useAppContext();
  const [comment, setComment] = useState(review.comment);
  const [photos, setPhotos] = useState<RestaurantPhoto[]>(review.photos);
  const [amount, setAmount] = useState(review.amountPerPerson?.toString() ?? "");
  const [visitDate, setVisitDate] = useState(review.visitDate);
  const [ratingDetails, setRatingDetails] = useState<ReviewRatingDetails | null>(() => review.ratingDetails ?? (review.ratingMethod === "dimensions" ? createGeneralRatingDetails({ food: review.foodRating, ambience: review.ambienceRating, service: review.serviceRating }) : null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!comment.trim()) { setError("Conte um pouco sobre sua experiência."); return; }
    if (visitDate > today()) { setError("A data da visita não pode estar no futuro."); return; }
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) { setError("Informe um valor válido."); return; }
    const foodRating = ratingDetails ? getTopicScore(ratingDetails.food) : undefined;
    const ambienceRating = ratingDetails ? getTopicScore(ratingDetails.ambience) : undefined;
    const serviceRating = ratingDetails ? getTopicScore(ratingDetails.service) : undefined;
    if (ratingDetails && ([ratingDetails.food, ratingDetails.ambience, ratingDetails.service].some((detail) => detail.mode === "criteria" && getCriteriaCount(detail) === 0) || !isDimensionRating(foodRating) || !isDimensionRating(ambienceRating) || !isDimensionRating(serviceRating))) { setError("Avalie cada tópico ou informe pelo menos um critério no detalhamento."); return; }
    setSaving(true);
    const saved = await updateReview(review.id, { comment: comment.trim(), photos, amountPerPerson: amount ? Number(amount) : undefined, visitDate, ...(ratingDetails ? { ratingDetails, foodRating: foodRating!, ambienceRating: ambienceRating!, serviceRating: serviceRating! } : {}) });
    setSaving(false);
    if (!saved) { setError("Não foi possível atualizar sua experiência. Tente novamente."); return; }
    onComplete();
  };

  const currency = review.currency ?? getCurrencyForCountry(restaurant.countryCode);
  return <form onSubmit={submit} className="space-y-5"><header><p className="text-xs font-black text-orange-600">EDITAR EXPERIÊNCIA</p><h2 className="mt-1 text-2xl font-black">{restaurant.name}</h2><p className="text-sm text-stone-500">{ratingDetails ? "Você pode manter a nota geral ou detalhar os tópicos." : "Esta avaliação antiga permanece no formato original."}</p></header>{ratingDetails && <section><h3 className="text-lg font-black">Sua avaliação</h3><div className="mt-3 grid gap-3"><DetailedRatingInput topic="food" value={ratingDetails.food} onChange={(food) => setRatingDetails((current) => current ? { ...current, food } : current)}/><DetailedRatingInput topic="ambience" value={ratingDetails.ambience} onChange={(ambience) => setRatingDetails((current) => current ? { ...current, ambience } : current)}/><DetailedRatingInput topic="service" value={ratingDetails.service} onChange={(service) => setRatingDetails((current) => current ? { ...current, service } : current)}/></div><p className="mt-3 text-sm font-bold text-stone-700">Nota da experiência: {formatRating(getRatingDetailsScore(ratingDetails))}</p></section>}<section><label htmlFor={`edit-comment-${review.id}`} className="mb-2 block text-sm font-black">Conte para seus amigos</label><textarea id={`edit-comment-${review.id}`} value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-28 w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/></section><PhotoUploader photos={photos} onChange={setPhotos}/><div className="grid gap-4 sm:grid-cols-2"><section><label htmlFor={`edit-amount-${review.id}`} className="mb-2 block text-sm font-black">Gasto por pessoa</label><div className="flex overflow-hidden rounded-2xl bg-stone-100 ring-orange-500 focus-within:ring-2"><span className="p-4 text-sm font-bold text-stone-500">{currency ?? "—"}</span><input id={`edit-amount-${review.id}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} className="min-w-0 flex-1 bg-transparent py-4 pr-4 text-sm outline-none"/></div>{!currency && <p className="mt-2 text-xs text-stone-500">Moeda não informada para esta experiência.</p>}</section><section><label htmlFor={`edit-date-${review.id}`} className="mb-2 block text-sm font-black">Data da visita</label><input id={`edit-date-${review.id}`} type="date" max={today()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/></section></div>{error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl px-4 text-sm font-black text-stone-600 hover:bg-stone-100">Cancelar</button><button disabled={saving} className="min-h-11 rounded-xl bg-orange-500 px-5 text-sm font-black text-white disabled:opacity-60">{saving ? "Salvando…" : "Salvar alterações"}</button></div></form>;
}
