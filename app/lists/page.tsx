"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { ListFormSheet } from "@/components/lists/list-form-sheet";
import { ListCard } from "@/components/lists/list-card";
import { useAppContext } from "@/hooks/use-app-context";

export default function ListsPage() {
  const { currentUserId, lists, isLoading, dataError, retryData } = useAppContext();
  const [createOpen, setCreateOpen] = useState(false);
  const mine = lists.filter((list) => list.ownerId === currentUserId);
  const defaults = mine.filter((list) => list.type !== "custom");
  const custom = mine.filter((list) => list.type === "custom");
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-8"><LoadingSkeleton className="h-8 w-48"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <LoadingSkeleton key={index} className="h-64"/>)}</div></div>;
  if (dataError) return <div className="mx-auto max-w-2xl px-4 py-8"><ErrorState message={dataError} onRetry={retryData}/></div>;
  return <div className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:py-10"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-bold text-orange-600">COLEÇÃO</p><h1 className="text-3xl font-black tracking-tight">Suas listas</h1></div><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-950 px-4 text-sm font-bold text-white"><Plus size={17}/> Criar lista</button></div><section className="mt-8"><h2 className="text-xl font-black">Listas padrão</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{defaults.map((list) => <ListCard key={list.id} list={list}/>)}</div></section><section className="mt-10"><h2 className="text-xl font-black">Minhas listas</h2>{custom.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{custom.map((list) => <ListCard key={list.id} list={list}/>)}</div> : <div className="mt-4"><EmptyState title="Sua primeira lista começa aqui" message="Crie listas para guardar seus próximos lugares favoritos." actionLabel="Criar lista" onAction={() => setCreateOpen(true)}/></div>}</section><ListFormSheet open={createOpen} onClose={() => setCreateOpen(false)}/></div>;
}
