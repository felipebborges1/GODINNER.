"use client";

import Link from "next/link";
import { users } from "@/data/mocks";
import { useAppContext } from "@/hooks/use-app-context";
import { AdminShell } from "./admin-shell";

export function AdminDashboard() {
  const { restaurants, reviews } = useAppContext();
  const pending = restaurants.filter((restaurant) => restaurant.status === "pending_review").sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  const latestSubmission = restaurants.map((restaurant) => restaurant.submittedAt).filter(Boolean).sort().at(-1);
  const recentCutoff = latestSubmission ? new Date(latestSubmission).getTime() - 30 * 24 * 60 * 60 * 1000 : 0;
  const recentSubmissions = restaurants.filter((restaurant) => restaurant.submittedAt && new Date(restaurant.submittedAt).getTime() >= recentCutoff).length;
  const metrics = [["Restaurantes", restaurants.length], ["Publicados", restaurants.filter((restaurant) => (restaurant.status ?? "published") === "published").length], ["Pendentes", pending.length], ["Rejeitados", restaurants.filter((restaurant) => restaurant.status === "rejected").length], ["Usuários", users.length], ["Reviews", reviews.length], ["Recebidos recentemente", recentSubmissions]] as const;
  return <AdminShell active="/admin"><p className="text-sm font-black text-orange-600">ADMIN GODINNER</p><h1 className="mt-1 text-3xl font-black">Visão geral</h1><div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>)}</div><section className="mt-9 grid gap-5 lg:grid-cols-[1fr_260px]"><div className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Pendências recentes</h2><Link className="text-sm font-bold text-orange-600" href="/admin/restaurants/pending">Revisar fila</Link></div>{pending.length ? <div className="mt-4 divide-y">{pending.slice(0, 5).map((restaurant) => <Link className="flex items-center justify-between gap-3 py-3" href={`/admin/restaurants/${restaurant.id}`} key={restaurant.id}><span><b className="block">{restaurant.name}</b><small className="text-stone-500">{restaurant.neighborhood} · {restaurant.city}</small></span><span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">Pendente</span></Link>)}</div> : <p className="mt-5 text-sm text-stone-500">Nenhum restaurante aguardando análise.</p>}</div><div className="rounded-3xl bg-stone-950 p-5 text-white"><h2 className="font-black">Atalhos</h2><Link className="mt-4 block rounded-xl bg-orange-500 px-3 py-3 text-sm font-bold" href="/admin/restaurants/pending">Revisar pendências</Link><Link className="mt-3 block rounded-xl bg-white/10 px-3 py-3 text-sm font-bold" href="/admin/restaurants">Ver restaurantes</Link></div></section></AdminShell>;
}
