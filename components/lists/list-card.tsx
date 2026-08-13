import Image from "next/image";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import type { RestaurantList } from "@/types";

export function ListCard({ list }: { list: RestaurantList }) {
  return <Link href={`/lists/${list.id}`} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="relative aspect-[16/9]"><Image src={list.coverPhoto} alt={`Capa da lista ${list.name}`} fill sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105"/>{list.type !== "custom" && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-stone-950/80 px-2 py-1 text-[10px] font-black text-white"><Sparkles size={12}/> PADRÃO</span>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-black">{list.name}</h2><span className="shrink-0 text-xs font-bold text-stone-500">{list.isPublic ? "Pública" : <Lock size={14}/>}</span></div><p className="mt-2 text-sm text-stone-500">{list.restaurantIds.length} {list.restaurantIds.length === 1 ? "lugar" : "lugares"}</p></div></Link>;
}
