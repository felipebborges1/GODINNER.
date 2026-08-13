"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { users } from "@/data/mocks";
import { EmptyState } from "@/components/ui/empty-state";
import { ListCard } from "@/components/lists/list-card";
import { ReviewCard } from "@/components/review/review-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAppContext } from "@/hooks/use-app-context";

type Tab = "experiences" | "lists" | "photos";
const tabs: Array<{ id: Tab; label: string }> = [{ id: "experiences", label: "Experiências" }, { id: "lists", label: "Listas" }, { id: "photos", label: "Fotos" }];

export function ProfileView({ userId, own }: { userId: string; own: boolean }) {
  const { currentUserId, reviews, lists, follows, restaurants, isAdmin, toggleFollow, showToast } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = users.find((item) => item.id === userId)!;
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabs.some((item) => item.id === tabParam) ? tabParam as Tab : "experiences";
  const ownReviews = reviews.filter((review) => review.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visitedIds = [...new Set(ownReviews.map((review) => review.restaurantId))];
  const taste = [...new Set(visitedIds.flatMap((id) => restaurants.find((restaurant) => restaurant.id === id)?.cuisine ?? []))].map((cuisine) => ({ cuisine, count: visitedIds.filter((id) => restaurants.find((restaurant) => restaurant.id === id)?.cuisine.includes(cuisine)).length })).sort((a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine)).slice(0, 3);
  const followers = follows.filter((follow) => follow.followingId === user.id).length;
  const following = follows.filter((follow) => follow.followerId === user.id).length;
  const followingUser = follows.some((follow) => follow.followerId === currentUserId && follow.followingId === user.id);
  const visibleLists = lists.filter((list) => list.ownerId === user.id && (own || list.isPublic));
  const photos = ownReviews.flatMap((review) => review.photos.map((photo) => ({ photo, restaurant: restaurants.find((item) => item.id === review.restaurantId) }))).filter((item, index, all) => all.findIndex((candidate) => candidate.photo.id === item.photo.id) === index);
  const setTab = (next: Tab) => router.push(`${own ? "/profile" : `/user/${user.username}`}?tab=${next}`);
  const follow = () => { const added = toggleFollow(user.id); showToast(added ? `Seguindo ${user.name}` : `Você deixou de seguir ${user.name}`); };
  return <div className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:py-10"><div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12"><section><div className="flex items-start gap-4"><UserAvatar src={user.avatar} name={user.name} size="lg"/><div className="min-w-0 flex-1"><h1 className="text-3xl font-black">{user.name}</h1><p className="mt-1 text-sm text-stone-500">@{user.username} · {user.neighborhood}</p><p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">{user.bio}</p></div>{own && isAdmin && <Link href="/admin" aria-label="Abrir painel administrativo" className="shrink-0 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-black text-stone-700 shadow-sm">Painel admin</Link>}{!own && <button onClick={follow} className={`min-h-11 rounded-full px-4 text-sm font-black ${followingUser ? "bg-stone-100 text-stone-800" : "bg-stone-950 text-white"}`}>{followingUser ? "Seguindo" : "Seguir"}</button>}</div><div className="mt-7 flex gap-6 text-sm"><span><b className="block text-lg">{visitedIds.length}</b>lugares</span><span><b className="block text-lg">{followers}</b>seguidores</span><span><b className="block text-lg">{following}</b>seguindo</span></div></section><aside className="mt-8 rounded-3xl bg-orange-50 p-5 lg:mt-0"><h2 className="text-lg font-black">Seu gosto</h2>{taste.length ? <ol className="mt-4 space-y-2">{taste.map((item, index) => <li key={item.cuisine} className="flex items-center gap-3 text-sm font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-orange-500 text-xs text-white">{index + 1}</span>{item.cuisine}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-stone-600">Avalie lugares para construir seu perfil gastronômico.</p>}</aside></div><div role="tablist" aria-label="Conteúdo do perfil" className="mt-10 flex gap-1 overflow-x-auto border-b border-stone-200">{tabs.map((item) => <button role="tab" aria-selected={tab === item.id} key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 px-4 py-3 text-sm font-bold ${tab === item.id ? "border-b-2 border-orange-500 text-orange-600" : "text-stone-500"}`}>{item.label}</button>)}</div>{tab === "experiences" && <section className="mt-6"><h2 className="sr-only">Experiências</h2>{ownReviews.length ? <div className="grid max-w-xl gap-4">{ownReviews.map((review) => <ReviewCard key={review.id} review={review} user={user} restaurant={restaurants.find((restaurant) => restaurant.id === review.restaurantId)}/>)}</div> : <EmptyState title="Nenhuma experiência publicada ainda." message={own ? "Registre sua próxima visita para começar." : "Esta pessoa ainda não publicou experiências."}/>}</section>}{tab === "lists" && <section className="mt-6">{visibleLists.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleLists.map((list) => <ListCard key={list.id} list={list}/>)}</div> : <EmptyState title="Nenhuma lista para mostrar." message={own ? "Organize seus próximos lugares em listas." : "Esta pessoa ainda não compartilhou listas."}/>}</section>}{tab === "photos" && <section className="mt-6">{photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{photos.map(({ photo, restaurant }) => restaurant && <Link key={photo.id} href={`/restaurant/${restaurant.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl"><Image src={photo.url} alt={`Foto publicada em ${restaurant.name}`} fill unoptimized sizes="(min-width: 1024px) 250px, 50vw" className="object-cover transition group-hover:scale-105"/><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3 text-xs font-bold text-white">{restaurant.name}</span></Link>)}</div> : <EmptyState title="Nenhuma foto publicada ainda." message="As fotos das experiências aparecem aqui."/>}</section>}</div>;
}
