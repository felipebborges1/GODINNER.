import Image from "next/image";
import Link from "next/link";
import type { Restaurant, Review, User } from "@/types";
import { GooglePlaceCover } from "@/components/restaurant/google-place-cover";
import { ReviewMedia } from "@/components/review/review-media";
import { RatingBadge } from "@/components/ui/rating-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getReviewScore } from "@/lib/review-rating";

export function FriendActivityCard({ user, restaurant, review }: { user: User; restaurant: Restaurant; review: Review }) {
  const score = getReviewScore(review);

  return <article className="w-64 shrink-0 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 sm:w-72">
    <div className="flex items-center gap-2.5 px-3.5 pt-3.5"><Link href={`/user/${user.username}`}><UserAvatar src={user.avatar} name={user.name} size="sm"/></Link><div className="min-w-0"><Link href={`/user/${user.username}`} className="block truncate text-sm font-bold">{user.name}</Link><p className="truncate text-xs text-stone-500">esteve no <Link href={`/restaurant/${restaurant.slug}`} className="font-semibold text-stone-700">{restaurant.name}</Link></p></div></div>
    <div className="relative mt-3"><ReviewMedia photos={review.photos} alt={`Foto da experiência no ${restaurant.name}`} rounded={false} fallback={restaurant.hasGooglePlaceCover ? <Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden"><GooglePlaceCover slug={restaurant.slug} fallbackUrl={restaurant.coverPhoto.url} alt={restaurant.name} variant="card"/></Link> : <Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[4/3] overflow-hidden"><Image src={restaurant.coverPhoto.url} alt={restaurant.name} fill sizes="288px" className="object-cover"/></Link>}/><div className="pointer-events-none absolute bottom-3 left-3">{score !== null && <RatingBadge rating={score}/>}</div></div>
    <p className="px-3.5 py-3 text-xs text-stone-500">{new Date(review.visitDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</p>
  </article>;
}
