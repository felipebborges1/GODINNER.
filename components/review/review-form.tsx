"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoginWall } from "@/components/auth/login-wall";
import { trackEvent } from "@/lib/analytics";
import { formatRating, getDimensionalReviewScore, isDimensionRating } from "@/lib/review-rating";
import type { Restaurant, RestaurantPhoto, Review } from "@/types";
import { useAppContext } from "@/hooks/use-app-context";
import { PhotoUploader } from "./photo-uploader";
import { RatingInput } from "./rating-input";
import { ReviewSuccess } from "./review-success";

const today = () => new Date().toISOString().slice(0, 10);

export function ReviewForm({ restaurant }: { restaurant: Restaurant }) {
  const { currentUserId, publishReview, showToast } = useAppContext();
  const [foodRating, setFoodRating] = useState<number | null>(null);
  const [serviceRating, setServiceRating] = useState<number | null>(null);
  const [ambienceRating, setAmbienceRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<RestaurantPhoto[]>([]);
  const [amount, setAmount] = useState("");
  const [visitDate, setVisitDate] = useState(today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Review | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const submitted = useRef(false);
  const photosRef = useRef<RestaurantPhoto[]>([]);
  const derivedScore = useMemo(() => getDimensionalReviewScore(foodRating, serviceRating, ambienceRating), [foodRating, serviceRating, ambienceRating]);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => { trackEvent("review_started", { restaurantId: restaurant.id }); }, [restaurant.id]);
  useEffect(() => () => { if (!submitted.current) photosRef.current.forEach((photo) => { if (photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url); }); }, []);
  if (published) return <ReviewSuccess review={published} restaurant={restaurant}/>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!currentUserId) { setLoginOpen(true); return; }
    if (!isDimensionRating(foodRating) || !isDimensionRating(serviceRating) || !isDimensionRating(ambienceRating)) nextErrors.rating = "Avalie comida, serviço e ambiente de 1 a 5 estrelas.";
    if (!comment.trim()) nextErrors.comment = "Conte um pouco sobre sua experiência.";
    if (visitDate > today()) nextErrors.visitDate = "A data da visita não pode estar no futuro.";
    if (amount && (!Number.isFinite(Number(amount)) || Number(amount) < 0)) nextErrors.amount = "Informe um valor válido.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !derivedScore) return;
    const review = await publishReview({ restaurantId: restaurant.id, foodRating: foodRating as number, serviceRating: serviceRating as number, ambienceRating: ambienceRating as number, comment: comment.trim(), photos, amountPerPerson: amount ? Number(amount) : undefined, visitDate });
    if (!review) { setErrors({ publish: "Não conseguimos publicar sua experiência. Tente novamente." }); return; }
    submitted.current = true;
    setPublished(review);
    trackEvent("review_published", { restaurantId: restaurant.id, hasPhoto: photos.length > 0, food_rating: foodRating ?? undefined, service_rating: serviceRating ?? undefined, ambience_rating: ambienceRating ?? undefined, derived_rating: derivedScore ?? undefined, rating_method: "dimensions" });
    showToast("Experiência publicada!");
  };
  return <><main className="mx-auto max-w-xl px-4 py-7 pb-28 lg:py-12"><form onSubmit={submit} className="space-y-7"><div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100"><Image src={restaurant.coverPhoto.url} alt={restaurant.name} width={72} height={72} className="h-18 w-18 rounded-2xl object-cover"/><div><p className="text-xs font-black text-orange-600">REGISTRAR EXPERIÊNCIA</p><h1 className="text-lg font-black">{restaurant.name}</h1><p className="text-sm text-stone-500">{restaurant.neighborhood}</p></div></div><section><h2 className="text-3xl font-black tracking-tight">Como foi sua experiência?</h2><div className="mt-5 grid gap-3"><RatingInput label="Comida" value={foodRating} onChange={setFoodRating}/><RatingInput label="Serviço" value={serviceRating} onChange={setServiceRating}/><RatingInput label="Ambiente" value={ambienceRating} onChange={setAmbienceRating}/></div><div className="mt-4 rounded-2xl bg-stone-950 px-5 py-4 text-white"><p className="text-xs font-bold text-stone-400">Sua nota</p><p className="mt-1 text-3xl font-black">{formatRating(derivedScore)}</p></div>{errors.rating && <p className="mt-2 text-sm font-semibold text-red-600">{errors.rating}</p>}</section><section><label htmlFor="comment" className="mb-2 block text-sm font-black">Conte para seus amigos</label><textarea id="comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="O que você mais gostou? O que pediria novamente?" className="min-h-32 w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/>{errors.comment && <p className="mt-2 text-sm font-semibold text-red-600">{errors.comment}</p>}</section><PhotoUploader photos={photos} onChange={setPhotos}/><section><label htmlFor="amount" className="mb-2 block text-sm font-black">Quanto você gastou por pessoa?</label><div className="flex overflow-hidden rounded-2xl bg-stone-100 ring-orange-500 focus-within:ring-2"><span className="p-4 text-sm font-bold text-stone-500">R$</span><input id="amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} placeholder="Opcional" className="min-w-0 flex-1 bg-transparent py-4 pr-4 text-sm outline-none"/></div>{errors.amount && <p className="mt-2 text-sm font-semibold text-red-600">{errors.amount}</p>}</section><section><label htmlFor="visit-date" className="mb-2 block text-sm font-black">Quando você foi?</label><input id="visit-date" type="date" max={today()} value={visitDate} onChange={(event) => setVisitDate(event.target.value)} className="w-full rounded-2xl bg-stone-100 p-4 text-sm outline-none ring-orange-500 focus:ring-2"/>{errors.visitDate && <p className="mt-2 text-sm font-semibold text-red-600">{errors.visitDate}</p>}</section>{errors.publish && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600">{errors.publish}</p>}<button className="w-full rounded-2xl bg-orange-500 py-4 text-sm font-black text-white shadow-lg shadow-orange-500/25">Publicar experiência</button></form></main><LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}/></>;
}
