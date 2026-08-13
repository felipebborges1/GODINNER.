"use client";

import Image from "next/image";
import { users } from "@/data/mocks";
import { useLists } from "@/hooks/use-lists";

export default function ListsPage() {
  const lists = useLists();
  return <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:py-10"><p className="text-sm font-bold text-orange-600">COLEÇÃO</p><h1 className="text-3xl font-black tracking-tight">Suas listas</h1><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lists.map((list) => <article key={list.id} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100"><div className="relative aspect-[16/9]"><Image src={list.coverPhoto} alt="Imagem ilustrativa da lista" fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw" className="object-cover"/></div><div className="p-4"><p className="text-xs font-bold text-orange-600">{list.isPublic ? "PÚBLICA" : "PRIVADA"}</p><h2 className="mt-1 font-bold">{list.name}</h2><p className="mt-1 text-sm text-stone-500">{list.restaurantIds.length} lugares · {users.find((user) => user.id === list.ownerId)?.name}</p></div></article>)}</div></div>;
}
