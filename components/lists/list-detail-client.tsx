"use client";

import Image from "next/image";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Clipboard, Edit3, Lock, Map, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { RestaurantCard } from "@/components/restaurant/restaurant-card";
import { MapView } from "@/components/search/map-view";
import { useAppContext } from "@/hooks/use-app-context";
import { ListFormSheet } from "./list-form-sheet";

export function ListDetailClient({ id }: { id: string }) {
  const { currentUserId, lists, restaurants, removeRestaurantFromList, deleteList, showToast } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const list = lists.find((item) => item.id === id);
  if (!list || (!list.isPublic && list.ownerId !== currentUserId)) notFound();
  const owner = list.ownerId === currentUserId;
  const canManage = owner && list.type === "custom";
  const listRestaurants = list.restaurantIds.flatMap((restaurantId) => { const restaurant = restaurants.find((item) => item.id === restaurantId); return restaurant ? [restaurant] : []; });
  const view = searchParams.get("view") === "map" ? "map" : "list";
  const setView = (next: "list" | "map") => router.push(`/lists/${list.id}?view=${next}`);
  const share = async () => { try { await navigator.clipboard?.writeText(`${window.location.origin}/lists/${list.id}`); showToast("Link copiado"); } catch { showToast("Link pronto para compartilhar"); } };
  const remove = (restaurantId: string) => { if (removeRestaurantFromList(list.id, restaurantId)) showToast("Removido da lista"); };
  const destroy = () => { if (deleteList(list.id)) { showToast("Lista excluída"); router.push("/lists"); } };
  const cover = listRestaurants[0]?.coverPhoto.url ?? list.coverPhoto;
  return <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:py-10"><div className="relative h-52 overflow-hidden rounded-[2rem] bg-stone-100 sm:h-72"><Image src={cover} alt={`Capa da lista ${list.name}`} fill sizes="(min-width: 1024px) 1152px, 100vw" className="object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 to-transparent"/><div className="absolute bottom-0 p-6 text-white"><span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur">{list.isPublic ? "Pública" : <><Lock size={13}/> Privada</>}</span><h1 className="mt-3 text-3xl font-black">{list.name}</h1>{list.description && <p className="mt-1 text-sm text-stone-200">{list.description}</p>}</div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-stone-500">{listRestaurants.length} {listRestaurants.length === 1 ? "lugar" : "lugares"}</p><div className="flex gap-2">{list.isPublic && <button onClick={share} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-stone-100 px-3 text-sm font-bold"><Share2 size={16}/> Compartilhar</button>}{canManage && <button onClick={() => setEditOpen(true)} aria-label="Editar lista" className="grid min-h-10 min-w-10 place-items-center rounded-full bg-stone-100"><Edit3 size={17}/></button>}{canManage && <button onClick={() => setDeleteOpen(true)} aria-label="Excluir lista" className="grid min-h-10 min-w-10 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={17}/></button>}</div></div><div className="mt-7 flex gap-2 rounded-2xl bg-stone-100 p-1 w-fit"><button onClick={() => setView("list")} className={`rounded-xl px-4 py-2 text-sm font-bold ${view === "list" ? "bg-white shadow-sm" : "text-stone-500"}`}>Lista</button><button onClick={() => setView("map")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${view === "map" ? "bg-white shadow-sm" : "text-stone-500"}`}><Map size={16}/>Mapa</button></div>{!listRestaurants.length ? <div className="mt-6"><EmptyState title="Esta lista ainda está vazia" message="Adicione restaurantes a partir do perfil de cada lugar."/></div> : view === "map" ? <div className="mt-6"><MapView restaurants={listRestaurants}/></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listRestaurants.map((restaurant) => <div key={restaurant.id} className="relative"><RestaurantCard restaurant={restaurant}/>{owner && <button onClick={() => remove(restaurant.id)} className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-red-600 shadow" aria-label={`Remover ${restaurant.name} da lista`}>Remover</button>}</div>)}</div>}<ListFormSheet open={editOpen} onClose={() => setEditOpen(false)} list={list}/><Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir lista"><p className="text-sm leading-6 text-stone-600">Esta ação remove a lista personalizada, mas não apaga os restaurantes salvos em outras listas.</p><div className="mt-6 flex gap-3"><button onClick={() => setDeleteOpen(false)} className="flex-1 rounded-2xl bg-stone-100 py-3 text-sm font-bold">Cancelar</button><button onClick={destroy} className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white">Excluir</button></div></Modal></div>;
}
