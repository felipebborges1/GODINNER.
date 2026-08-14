"use client";

import { Check, Heart, Plus, Star } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ListFormSheet } from "@/components/lists/list-form-sheet";
import { useAppContext } from "@/hooks/use-app-context";

export function SaveToListSheet({ open, onClose, restaurantId }: { open: boolean; onClose: () => void; restaurantId: string }) {
  const { currentUserId, lists, toggleRestaurantInList, showToast } = useAppContext();
  const [createOpen, setCreateOpen] = useState(false);
  const mine = lists.filter((list) => list.ownerId === currentUserId);
  const toggle = async (listId: string, name: string) => { const added = await toggleRestaurantInList(listId, restaurantId); showToast(added ? `Adicionado a ${name}` : `Removido de ${name}`); };
  return <><BottomSheet open={open && !createOpen} onClose={onClose} title="Adicionar à lista"><div className="space-y-2">{mine.map((list) => { const saved = list.restaurantIds.includes(restaurantId); const Icon = list.type === "want" ? Heart : list.type === "favorites" ? Star : Plus; return <button key={list.id} onClick={() => toggle(list.id, list.name)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-stone-50"><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon size={19}/></span><span className="flex-1"><b className="block text-sm">{list.name}</b><span className="text-xs text-stone-500">{list.type === "custom" ? "Minha lista" : "Lista padrão"}</span></span>{saved && <Check className="text-orange-600" size={20}/>}</button>; })}</div><button onClick={() => setCreateOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 py-3 text-sm font-bold"><Plus size={17}/> Criar nova lista</button></BottomSheet><ListFormSheet open={createOpen} onClose={() => { setCreateOpen(false); onClose(); }} restaurantId={restaurantId}/></>;
}
