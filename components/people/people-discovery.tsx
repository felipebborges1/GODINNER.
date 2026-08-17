"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoginWall } from "@/components/auth/login-wall";
import { SearchBar } from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { RatingBadge } from "@/components/ui/rating-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import { normalize } from "@/lib/search";

export function PeopleDiscovery() {
  const { currentUserId, follows, reviews, restaurants, users, isLoading, dataError, retryData, toggleFollow, showToast } = useAppContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  useEffect(() => { trackEvent("people_discovery_viewed"); }, []);

  const followingIds = useMemo(() => new Set(follows
    .filter((follow) => follow.followerId === currentUserId)
    .map((follow) => follow.followingId)), [currentUserId, follows]);

  const activities = useMemo(() => {
    const normalizedQuery = normalize(query);
    const seenUsers = new Set<string>();

    return reviews
      .filter((review) => review.userId !== currentUserId)
      .map((review) => ({
        review,
        user: users.find((user) => user.id === review.userId),
        restaurant: restaurants.find((restaurant) => restaurant.id === review.restaurantId),
      }))
      .filter((item): item is typeof item & { user: (typeof users)[number]; restaurant: (typeof restaurants)[number] } => Boolean(item.user && item.restaurant))
      .sort((a, b) => b.review.createdAt.localeCompare(a.review.createdAt))
      .filter(({ user }) => {
        if (seenUsers.has(user.id)) return false;
        seenUsers.add(user.id);
        return true;
      })
      .filter(({ user, restaurant }) => !normalizedQuery || normalize([
        user.name,
        user.username,
        user.neighborhood,
        restaurant.name,
        restaurant.neighborhood,
        ...restaurant.cuisine,
      ].join(" ")).includes(normalizedQuery))
      .sort((a, b) => Number(followingIds.has(a.user.id)) - Number(followingIds.has(b.user.id)));
  }, [currentUserId, followingIds, query, restaurants, reviews, users]);

  const isFollowing = (userId: string) => follows.some((follow) => follow.followerId === currentUserId && follow.followingId === userId);
  const follow = async (userId: string, userName: string) => {
    if (!currentUserId) { setLoginOpen(true); return; }
    const wasFollowing = isFollowing(userId);
    const nextFollowing = await toggleFollow(userId);
    trackEvent("user_followed", { userId, following: nextFollowing });
    showToast(wasFollowing ? `Você deixou de seguir ${userName}` : `Você está seguindo ${userName}`);
  };

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12"><LoadingSkeleton className="h-10 w-72"/><LoadingSkeleton className="mt-3 h-5 w-full max-w-xl"/><div className="mt-8 grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <LoadingSkeleton key={index} className="h-72"/>)}</div></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-10"><ErrorState message={dataError} onRetry={retryData}/></div>;

  return <main className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 lg:py-12">
    <header>
      <p className="text-sm font-black tracking-wide text-orange-600">PESSOAS</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Descubra pessoas pelo que elas gostam</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">Veja experiências reais e encontre novos perfis para acompanhar pelo jeito que escolhem onde comer.</p>
      <div className="mt-6 max-w-xl"><SearchBar value={query} onChange={setQuery} placeholder="Buscar pessoa, restaurante ou cozinha"/></div>
    </header>
    {activities.length ? <div className="mt-8 grid gap-4 md:grid-cols-2">{activities.slice(0, 12).map(({ review, user, restaurant }, index) => { const photo = review.photos[0]?.url ?? restaurant.coverPhoto.url; return <article key={review.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100"><div className="flex items-center gap-3 p-4"><Link href={`/user/${user.username}`} aria-label={`Ver perfil de ${user.name}`}><UserAvatar src={user.avatar} name={user.name}/></Link><div className="min-w-0 flex-1"><Link href={`/user/${user.username}`} className="block truncate text-sm font-black">{user.name}</Link><p className="mt-1 text-xs text-stone-500">esteve no <Link href={`/restaurant/${restaurant.slug}`} className="font-bold text-stone-700">{restaurant.name}</Link></p></div><Button variant={isFollowing(user.id) ? "soft" : "accent"} onClick={() => void follow(user.id, user.name)} aria-label={`${isFollowing(user.id) ? "Deixar de seguir" : "Seguir"} ${user.name}`}>{isFollowing(user.id) ? "Seguindo" : "Seguir"}</Button></div><Link href={`/restaurant/${restaurant.slug}`} className="relative block aspect-[16/10] overflow-hidden"><Image src={photo} alt={`Experiência de ${user.name} em ${restaurant.name}`} fill priority={index === 0} loading={index === 0 ? "eager" : "lazy"} sizes="(min-width: 768px) 360px, 100vw" className="object-cover"/><div className="absolute bottom-3 left-3"><RatingBadge rating={review.rating}/></div></Link><div className="p-4"><p className="text-sm leading-6 text-stone-700">{review.comment || "Compartilhou uma experiência neste lugar."}</p><p className="mt-2 text-xs text-stone-500">{restaurant.cuisine[0]} · {restaurant.neighborhood}</p></div></article>; })}</div> : <div className="mt-8"><p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-sm text-stone-600">Ainda não encontramos experiências de outras pessoas por aqui.</p></div>}
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}/>
  </main>;
}
