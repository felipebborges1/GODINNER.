"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoginWall } from "@/components/auth/login-wall";
import { ListCard } from "@/components/lists/list-card";
import { ReviewCard } from "@/components/review/review-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";
import { trackEvent } from "@/lib/analytics";
import type { User } from "@/types";
import { BetaFeedback } from "./beta-feedback";
import { PushNotificationSettings } from "@/components/push/push-notification-settings";
import { ProfileAvatarEditor } from "./profile-avatar-editor";
import { NotificationBell } from "@/components/notifications/notification-bell";

type Tab = "experiences" | "lists" | "photos";
type ProfileList = "places" | "followers" | "following";
const tabs: Array<{ id: Tab; label: string }> = [{ id: "experiences", label: "Experiências" }, { id: "lists", label: "Listas" }, { id: "photos", label: "Fotos" }];

export function ProfileView({ userId, own }: { userId: string; own: boolean }) {
  const { currentUserId, users, reviews, lists, follows, restaurants, isAdmin, toggleFollow, showToast, updateProfileAvatar } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileList, setProfileList] = useState<ProfileList | null>(null);
  const user = users.find((item) => item.id === userId);
  if (!user) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm font-bold text-stone-500">Carregando perfil...</div>;
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabs.some((item) => item.id === tabParam) ? tabParam as Tab : "experiences";
  const ownReviews = reviews.filter((review) => review.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visitedIds = [...new Set(ownReviews.map((review) => review.restaurantId))];
  const taste = [...new Set(visitedIds.flatMap((id) => restaurants.find((restaurant) => restaurant.id === id)?.cuisine ?? []))].map((cuisine) => ({ cuisine, count: visitedIds.filter((id) => restaurants.find((restaurant) => restaurant.id === id)?.cuisine.includes(cuisine)).length })).sort((a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine)).slice(0, 3);
  const followers = follows.filter((follow) => follow.followingId === user.id).length;
  const following = follows.filter((follow) => follow.followerId === user.id).length;
  const followingUser = follows.some((follow) => follow.followerId === currentUserId && follow.followingId === user.id);
  const followersUsers = follows.filter((follow) => follow.followingId === user.id).map((follow) => users.find((item) => item.id === follow.followerId)).filter((item): item is User => Boolean(item));
  const followingUsers = follows.filter((follow) => follow.followerId === user.id).map((follow) => users.find((item) => item.id === follow.followingId)).filter((item): item is User => Boolean(item));
  const visitedRestaurants = visitedIds.map((id) => restaurants.find((restaurant) => restaurant.id === id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const visibleLists = lists.filter((list) => list.ownerId === user.id && (own || list.isPublic));
  const photos = ownReviews.flatMap((review) => review.photos.map((photo) => ({ photo, restaurant: restaurants.find((item) => item.id === review.restaurantId) }))).filter((item, index, all) => all.findIndex((candidate) => candidate.photo.id === item.photo.id) === index);
  const setTab = (next: Tab) => router.push(`${own ? "/profile" : `/user/${user.username}`}?tab=${next}`);
  const toggleUserFollow = async (target: User) => {
    if (!currentUserId) { setLoginOpen(true); return; }
    const added = await toggleFollow(target.id);
    trackEvent("user_followed", { userId: target.id, following: added });
    showToast(added ? `Seguindo ${target.name}` : `Você deixou de seguir ${target.name}`);
  };
  const next = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const listTitle = profileList === "places" ? "Lugares visitados" : profileList === "followers" ? "Seguidores" : "Seguindo";
  const connectionRows = profileList === "followers" ? followersUsers : followingUsers;
  const saveAvatar = async (file: File) => {
    const hadAvatar = Boolean(user.avatar);
    const result = await updateProfileAvatar(file);
    if (result.ok) { trackEvent(hadAvatar ? "profile_photo_changed" : "profile_photo_added"); showToast(hadAvatar ? "Foto de perfil atualizada" : "Foto de perfil adicionada"); }
    return result;
  };
  const removeAvatar = async () => {
    const result = await updateProfileAvatar(null);
    if (result.ok) { trackEvent("profile_photo_removed"); showToast("Foto de perfil removida"); }
    return result;
  };

  return <>
    <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:py-10">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <section>
          <div className={`flex items-start gap-3 sm:gap-4 ${own ? "pb-14" : ""}`}>{own ? <ProfileAvatarEditor user={user} onSave={saveAvatar} onRemove={removeAvatar}/> : <UserAvatar src={user.avatar} name={user.name} size="lg"/>}<div className="min-w-0 flex-1"><div className="flex min-w-0 items-center"><div className="min-w-0"><h1 className="truncate text-3xl font-black">{user.name}</h1><p className="mt-1 truncate text-sm text-stone-500">@{user.username} · {user.neighborhood}</p></div></div><p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">{user.bio}</p></div><div className="flex shrink-0 items-center gap-2"><div className="lg:hidden"><NotificationBell mobile/></div>{own && isAdmin && <Link href="/admin" aria-label="Abrir painel administrativo" className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 shadow-sm">Painel admin</Link>}{!own && <Button variant={followingUser ? "soft" : "solid"} onClick={() => void toggleUserFollow(user)}>{followingUser ? "Seguindo" : "Seguir"}</Button>}</div></div>
          <div className="mt-7 flex gap-6 text-sm"><button type="button" onClick={() => setProfileList("places")} className="rounded-lg text-left transition hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><b className="block text-lg">{visitedIds.length}</b>lugares</button><button type="button" onClick={() => setProfileList("followers")} className="rounded-lg text-left transition hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><b className="block text-lg">{followers}</b>seguidores</button><button type="button" onClick={() => setProfileList("following")} className="rounded-lg text-left transition hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><b className="block text-lg">{following}</b>seguindo</button></div>
        </section>
        <aside className="mt-8 rounded-3xl bg-orange-50 p-5 lg:mt-0"><h2 className="text-lg font-black">Seu gosto</h2>{taste.length ? <ol className="mt-4 space-y-2">{taste.map((item, index) => <li key={item.cuisine} className="flex items-center gap-3 text-sm font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-xs text-white">{index + 1}</span>{item.cuisine}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-stone-600">Avalie lugares para construir seu perfil gastronômico.</p>}</aside>
      </div>
      {profileList ? <section className="mt-10"><div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">Perfil</p><h2 className="mt-1 text-2xl font-black">{listTitle}</h2></div><button type="button" onClick={() => setProfileList(null)} className="min-h-11 rounded-full bg-stone-100 px-4 text-sm font-bold transition hover:bg-stone-200">Voltar ao perfil</button></div>{profileList === "places" ? (visitedRestaurants.length ? <div className="mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">{visitedRestaurants.map((restaurant) => <Link key={restaurant.id} href={`/restaurant/${restaurant.slug}`} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><Image src={restaurant.coverPhoto.url} alt="" width={64} height={64} sizes="64px" className="h-16 w-16 rounded-xl object-cover"/><span className="min-w-0 flex-1"><b className="block truncate text-sm">{restaurant.name}</b><span className="mt-1 block text-xs text-stone-500">{restaurant.neighborhood} · {restaurant.cuisine[0]}</span></span></Link>)}</div> : <p className="mt-5 text-sm leading-6 text-stone-600">Nenhum lugar visitado ainda.</p>) : connectionRows.length ? <div className="mt-5 grid max-w-3xl gap-3">{connectionRows.map((connection) => { const isCurrentUser = connection.id === currentUserId; const viewerFollowsConnection = follows.some((follow) => follow.followerId === currentUserId && follow.followingId === connection.id); const actionLabel = own && profileList === "following" && viewerFollowsConnection ? "Deixar de seguir" : viewerFollowsConnection ? "Seguindo" : "Seguir"; return <div key={connection.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm"><Link href={`/user/${connection.username}`} className="flex min-w-0 flex-1 items-center gap-3"><UserAvatar src={connection.avatar} name={connection.name}/><span className="min-w-0"><b className="block truncate text-sm">{connection.name}</b><span className="block truncate text-xs text-stone-500">@{connection.username}</span></span></Link>{!isCurrentUser && <Button className="min-h-10 shrink-0 px-3 text-xs" variant={viewerFollowsConnection ? "soft" : "solid"} onClick={() => void toggleUserFollow(connection)}>{actionLabel}</Button>}</div>; })}</div> : <p className="mt-5 text-sm leading-6 text-stone-600">{profileList === "followers" ? "Ainda não há seguidores para mostrar." : "Esta pessoa ainda não segue ninguém."}</p>}</section> : <><div role="tablist" aria-label="Conteúdo do perfil" className="mt-10 flex gap-1 overflow-x-auto border-b border-stone-200">{tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 px-4 py-3 text-sm font-bold ${tab === item.id ? "border-b-2 border-orange-500 text-orange-600" : "text-stone-500"}`}>{item.label}</button>)}</div>
      {tab === "experiences" && <section className="mt-6"><h2 className="sr-only">Experiências</h2>{ownReviews.length ? <div className="grid max-w-xl gap-4">{ownReviews.map((review) => <ReviewCard key={review.id} review={review} user={user} restaurant={restaurants.find((restaurant) => restaurant.id === review.restaurantId)}/>)}</div> : <EmptyState title="Nenhuma experiência publicada ainda." message={own ? "Registre sua próxima visita para começar." : "Esta pessoa ainda não publicou experiências."} actionLabel={own ? "Explorar restaurantes" : undefined} actionHref={own ? "/search" : undefined}/>}</section>}
      {tab === "lists" && <section className="mt-6">{visibleLists.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleLists.map((list) => <ListCard key={list.id} list={list}/>)}</div> : <EmptyState title="Nenhuma lista para mostrar." message={own ? "Organize seus próximos lugares em listas." : "Esta pessoa ainda não compartilhou listas."}/>}</section>}
      {tab === "photos" && <section className="mt-6">{photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map(({ photo, restaurant }) => restaurant && <Link key={photo.id} href={`/restaurant/${restaurant.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl"><Image src={photo.url} alt={`Foto publicada em ${restaurant.name}`} fill unoptimized sizes="(min-width: 1024px) 250px, 50vw" className="object-cover transition group-hover:scale-105"/><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3 text-xs font-bold text-white">{restaurant.name}</span></Link>)}</div> : <EmptyState title="Nenhuma foto publicada ainda." message="As fotos das experiências aparecem aqui."/>}</section>}</>}
      {own && <div className="mt-8 grid max-w-xl gap-4"><PushNotificationSettings/><BetaFeedback/></div>}
    </div>
    <LoginWall open={loginOpen} onClose={() => setLoginOpen(false)} next={next}/>
  </>;
}
