"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Restaurant, RestaurantPhoto, Review } from "@/types";
import { useAppContext } from "@/hooks/use-app-context";
import { PhotoUploader } from "./photo-uploader";
import { RatingInput } from "./rating-input";
import { ReviewSuccess } from "./review-success";

const today = () => new Date().toISOString().slice(0, 10);

export function ReviewForm({ restaurant }: { restaurant: Restaurant }) {
  const { currentUserId, publishReview, showToast } = useAppContext();
  const [rating, setRating] = useState(9);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
  const [amount, setAmount] = useState("");
  const [visitDate, setVisitDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Review | null>(null);
  const submitted = useRef(false);
  const photosRef = useRef<RestaurantPhoto[]>([]);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => { if (!submitted.current) photosRef.current.forEach((photo) => { if (photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url); }); }, []);
  if (published) return <ReviewSuccess review={published} restaurant={restaurant}/>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!currentUserId) nextErrors.login = "Entre para publicar uma experiência.";
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) nextErrors.rating = "Escolha uma nota entre 0.0 e 10.0.";
    if (!comment.trim()) nextErrors.comment = "Conte um pouco sobre sua experiência.";
    if (visitDate > today()) nextErrors.visitDate = "A data da visita não pode estar no futuro.";
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) nextErrors.amount = "Informe um valor válido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const review = await publishReview({ restaurantId: restaurant.id, rating: Number(rating.toFixed(1)), comment: comment.trim(), photos, amountPerPerson: amount ? Number(amount) : undefined, visitDate });
    if (!review) return;
    submitted.current = true;
    setPublished(review);
    showToast("Experiência publicada!");
  };
  return <main className="mx-auto max-w-xl px-4 py-7 pb-28 lg:py-12"><form onSubmit={submit} className="space-y-7"><div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100"><Image src={restaurant.coverPhoto.url} alt={restaurant.name} width={72} height={72} className="h-18 w-18 rounded-2xl object-cover"/><div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="text-lg font-black">{restaurant.name}</h1><p className="text-sm text-stone-500">{restaurant.neighborhood}</p></div></div><h2 className="text-3xl font-black tracking-tight">Como foi sua experiência?</h2><section><label className="mb-2 block text-sm font-black">Sua nota</label><RatingInput value={rating} onChange={setRating}/>{errors.rating && <p className="mt-2 text-sm font-semibold text-red-600">{errors.rating}</p>}</section><section><label htmlFor="comment" className="mb-2 block text-sm font-black">Conte para seus amigos</label><textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="O que você mais gostou? O que pediria novamente?" className="min-h-32 w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/>{errors.comment && <p className="mt-2 text-sm font-semibold text-red-600">{errors.comment}</p>}</section><PhotoUploader photos={photos} onChange={setPhotos}/><section><label htmlFor="amount" className="mb-2 block text-sm font-black">Quanto você gastou por pessoa?</label><div className="flex overflow-hidden rounded-2xl bg-stone-100 ring-orange-500 focus-within:ring-2"><span className="p-4 text-sm font-bold text-stone-500">R$</span><input id="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} placeholder="Opcional" className="min-w-0 flex-1 bg-transparent py-4 pr-4 text-sm outline-none"/></div>{errors.amount && <p className="mt-2 text-sm font-semibold text-red-600">{errors.amount}</p>}</section><section><label htmlFor="visit-date" className="mb-2 block text-sm font-black">Quando você foi?</label><input id="visit-date" type="date" max={today()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/>{errors.visitDate && <p className="mt-2 text-sm font-semibold text-red-600">{errors.visitDate}</p>}</section>{errors.login && <p className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.login}</p>}<button className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25">Publicar experiência</button></form></main>;
}
