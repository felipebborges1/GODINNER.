import Image from "next/image";
import Link from "next/link";
import { RatingBadge } from "@/components/ui/rating-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ReviewSocialActions } from "@/components/review/review-social-actions";
import { formatCurrency } from "@/lib/utils";
import type { Restaurant, Review, User } from "@/types";

export function ReviewCard({ review, user, restaurant }: { review: Review; user: User; restaurant?: Restaurant }) {
  return <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-100"><div className="flex items-center gap-3"><Link href={`/user/${user.username}`} aria-label={`Ver perfil de ${user.name}`}><UserAvatar src={user.avatar} name={user.name}/></Link><div className="min-w-0 flex-1"><Link href={`/user/${user.username}`} className="block"><p className="truncate text-sm font-bold">{user.name}</p></Link><p className="text-xs text-stone-500">@{user.username}{restaurant && <> · <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-stone-700">{restaurant.name}</Link></>}</p></div><RatingBadge rating={review.rating}/></div><p className="mt-4 text-sm leading-6 text-stone-700">{review.comment}</p><div className="mt-3 flex gap-3 text-xs font-medium text-stone-400"><span>{new Date(review.visitDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>{review.amountPerPerson !== undefined && <span>{formatCurrency(review.amountPerPerson)} por pessoa</span>}</div>{review.photos[0] && <div className="relative mt-4 aspect-video"><Image src={review.photos[0].url} alt="Foto da experiência" fill sizes="(min-width: 640px) 576px, 100vw" className="rounded-2xl object-cover"/></div>}<ReviewSocialActions reviewId={review.id}/></article>;
}
