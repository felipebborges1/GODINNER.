"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAppContext } from "@/hooks/use-app-context";
import type { RestaurantList } from "@/types";

type Draft = Pick<RestaurantList, "name" | "description" | "isPublic">;
type Props = { open: boolean; onClose: () => void; list?: RestaurantList; restaurantId?: string; onSaved?: (list: RestaurantList) => void };

export function ListFormSheet({ open, onClose, list, restaurantId, onSaved }: Props) {
  return <BottomSheet open={open} onClose={onClose} title={list ? "Editar lista" : "Criar lista"}>{open && <ListFormContent key={list?.id ?? "new"} list={list} restaurantId={restaurantId} onClose={onClose} onSaved={onSaved}/>}</BottomSheet>;
}

function ListFormContent({ list, restaurantId, onClose, onSaved }: Omit<Props, "open">) {
  const { createList, updateList, showToast } = useAppContext();
  const [draft, setDraft] = useState<Draft>(() => list ? { name: list.name, description: list.description, isPublic: list.isPublic } : { name: "", description: "", isPublic: true });
  const [error, setError] = useState("");
  const save = async () => {
    if (!draft.name.trim()) { setError("Dê um nome para a lista."); return; }
    if (list) { if (await updateList(list.id, draft)) { showToast("Lista atualizada"); onClose(); } return; }
    const created = await createList(draft, restaurantId);
    if (created) { showToast("Lista criada"); onSaved?.(created); onClose(); }
  };
  return <div className="space-y-4"><div><label htmlFor="list-name" className="mb-2 block text-sm font-bold">Nome da lista</label><input id="list-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex.: Date em BH" className="w-full rounded-2xl bg-stone-100 p-3 text-sm outline-none ring-orange-500 focus:ring-2"/>{error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}</div><div><label htmlFor="list-description" className="mb-2 block text-sm font-bold">Descrição <span className="font-normal text-stone-400">(opcional)</span></label><textarea id="list-description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="min-h-24 w-full rounded-2xl bg-stone-100 p-3 text-sm outline-none ring-orange-500 focus:ring-2"/></div><label className="flex items-center justify-between rounded-2xl bg-stone-50 p-3"><span><b className="block text-sm">Lista pública</b><span className="text-xs text-stone-500">Qualquer pessoa pode abrir o link</span></span><input aria-label="Lista pública" type="checkbox" checked={draft.isPublic} onChange={(event) => setDraft({ ...draft, isPublic: event.target.checked })} className="h-5 w-5 accent-orange-500"/></label><button onClick={save} className="w-full rounded-2xl bg-stone-950 py-3 text-sm font-bold text-white">{list ? "Salvar alterações" : "Criar lista"}</button></div>;
}
