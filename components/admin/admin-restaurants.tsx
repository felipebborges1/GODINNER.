"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { users } from "@/data/mocks";
import { useAppContext } from "@/hooks/use-app-context";
import { normalize } from "@/lib/search";
import { AdminShell } from "./admin-shell";

const statuses = [["", "Todos"], ["published", "Publicados"], ["pending_review", "Pendentes"], ["rejected", "Rejeitados"]];

export function AdminRestaurants({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { restaurants, reviews, approveRestaurant, rejectRestaurant, showToast } = useAppContext();
  const params = useSearchParams(); const router = useRouter(); const q = params.get("q") ?? "";
  const status = pendingOnly ? "pending_review" : params.get("status") ?? "";
  const set = (key: string, value: string) => { const next = new URLSearchParams(params.toString()); value ? next.set(key, value) : next.delete(key); router.replace(`/admin/restaurants${pendingOnly ? "/pending" : ""}?${next}`); };
  const rows = useMemo(() => restaurants.filter((restaurant) => {
    const text = normalize([restaurant.name, restaurant.neighborhood, restaurant.city, ...restaurant.cuisine, restaurant.chef].join(" "));
    return (!q || text.includes(normalize(q))) && (!status || (restaurant.status ?? "published") === status) && (!params.get("type") || restaurant.category === params.get("type")) && (!params.get("city") || restaurant.city === params.get("city"));
  }).sort((a, b) => pendingOnly ? (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "") : a.name.localeCompare(b.name)), [restaurants, q, status, params, pendingOnly]);
  const quick = (id: string, action: "approve" | "reject") => { if (!window.confirm(action === "approve" ? "Aprovar este restaurante?" : "Rejeitar este restaurante?")) return; const result = action === "approve" ? approveRestaurant(id) : rejectRestaurant(id, "dados insuficientes"); showToast(result.ok ? "Moderação atualizada" : result.error); };
  return <AdminShell active={pendingOnly ? "/admin/restaurants/pending" : "/admin/restaurants"}>
    <p className="text-sm font-black text-orange-600">CATÁLOGO</p><h1 className="mt-1 text-3xl font-black">{pendingOnly ? "Fila de pendências" : "Restaurantes"}</h1>
    <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"><input aria-label="Buscar restaurantes" value={q} onChange={(event) => set("q", event.target.value)} placeholder="Nome, bairro, cidade, culinária ou chef" className="rounded-xl border border-stone-300 bg-white px-4 py-3"/><select aria-label="Status" value={status} disabled={pendingOnly} onChange={(event) => set("status", event.target.value)} className="rounded-xl border bg-white px-3 py-3">{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select aria-label="Tipo" value={params.get("type") ?? ""} onChange={(event) => set("type", event.target.value)} className="rounded-xl border bg-white px-3 py-3"><option value="">Todos os tipos</option><option value="restaurant">Restaurante</option><option value="bar">Bar</option></select><select aria-label="Cidade" value={params.get("city") ?? ""} onChange={(event) => set("city", event.target.value)} className="rounded-xl border bg-white px-3 py-3"><option value="">Todas as cidades</option><option>Belo Horizonte</option><option>Nova Lima</option></select></div>
    {rows.length ? <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm"><div className="hidden grid-cols-[64px_1.4fr_1fr_1fr_100px] gap-3 border-b p-4 text-xs font-bold uppercase text-stone-500 md:grid"><span>Foto</span><span>Restaurante</span><span>Local</span><span>Status / envio</span><span>Reviews</span></div>{rows.map((restaurant) => { const author = users.find((user) => user.id === restaurant.submittedBy); return <div key={restaurant.id} className="grid gap-3 border-b p-4 md:grid-cols-[64px_1.4fr_1fr_1fr_100px] md:items-center"><Image src={restaurant.coverPhoto.url} alt="" width={48} height={48} className="h-12 w-12 rounded-xl object-cover"/><span><Link className="font-bold hover:text-orange-600" href={`/admin/restaurants/${restaurant.id}`}>{restaurant.name}</Link><small className="block text-stone-500">{restaurant.category === "bar" ? "Bar" : "Restaurante"} · {restaurant.cuisine.join(", ")}</small></span><span className="text-sm">{restaurant.neighborhood}<small className="block text-stone-500">{restaurant.city}</small></span><span className="text-sm"><b>{restaurant.status ?? "published"}</b><small className="block text-stone-500">{author?.name ?? "Legado"}{restaurant.submittedAt ? ` · ${new Date(restaurant.submittedAt).toLocaleDateString("pt-BR")}` : ""}</small></span><span className="flex items-center gap-2 text-sm">{reviews.filter((review) => review.restaurantId === restaurant.id).length}{restaurant.status === "pending_review" && <><button onClick={() => quick(restaurant.id, "approve")} className="rounded-lg bg-stone-950 px-2 py-1 text-xs font-bold text-white">Aprovar</button><button onClick={() => quick(restaurant.id, "reject")} className="rounded-lg bg-stone-200 px-2 py-1 text-xs font-bold">Rejeitar</button></>}</span></div>; })}</div> : <p className="mt-8 rounded-2xl bg-white p-6 text-stone-500">Nenhum restaurante corresponde aos filtros.</p>}
  </AdminShell>;
}
