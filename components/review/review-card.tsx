import Link from "next/link";
import { ReviewPhoto } from "@/components/review/review-photo";
import { RatingBadge } from "@/components/ui/rating-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ReviewSocialActions } from "@/components/review/review-social-actions";
import { ReviewOwnerActions } from "@/components/review/review-owner-actions";
import { getReviewScore } from "@/lib/review-rating";
import { formatCurrency } from "@/lib/utils";
import type { Restaurant, Review, User } from "@/types";

export function ReviewCard({ review, user, restaurant }: { review: Review; user: User; restaurant?: Restaurant }) {
  const score = getReviewScore(review);
  const hasDimensions = review.ratingMethod === "dimensions";
  const wasEdited = Boolean(review.updatedAt && new Date(review.updatedAt).getTime() > new Date(review.createdAt).getTime());
  return <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100"><div className="flex items-center gap-3"><Link href={`/user/${user.username}`} aria-label={`Ver perfil de ${user.name}`}><UserAvatar src={user.avatar} name={user.name}/></Link><div className="min-w-0 flex-1"><Link href={`/user/${user.username}`} className="block"><p className="truncate text-sm font-bold">{user.name}</p></Link><p className="text-xs text-stone-500">@{user.username}{restaurant && <> · <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-stone-700">{restaurant.name}</Link></>}</p></div>{score !== null && <RatingBadge rating={score}/>}<ReviewOwnerActions review={review} restaurant={restaurant}/></div>{hasDimensions ? <p className="mt-3 text-xs font-semibold text-stone-500">Comida {review.foodRating} · Serviço {review.serviceRating} · Ambiente {review.ambienceRating}</p> : <p className="mt-3 text-xs font-semibold text-stone-400">Avaliação geral</p>}<p className="mt-3 text-sm leading-6 text-stone-700">{review.comment}</p><div className="mt-3 flex gap-3 text-xs font-medium text-stone-400"><span>{new Date(review.visitDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>{review.amountPerPerson !== undefined && <span>{formatCurrency(review.amountPerPerson)} por pessoa</span>}{wasEdited && <span>Editado</span>}</div>{review.photos[0] && <ReviewPhoto src={review.photos[0].url} alt="Foto da experiência" className="mt-4"/>}<ReviewSocialActions reviewId={review.id}/></article>;
}
