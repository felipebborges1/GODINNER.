"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function SearchBar({ placeholder = "Restaurantes, cozinhas ou regiões", navigateOnFocus = false, value, onChange, onClear }: { placeholder?: string; navigateOnFocus?: boolean; value?: string; onChange?: (value:string)=>void; onClear?: () => void }) {
  const router = useRouter();
  const goToSearch = () => { if (navigateOnFocus) router.push("/search"); };
  return <div className="flex items-center gap-3 rounded-2xl bg-stone-100 px-4 py-3 text-stone-500"><Search size={20}/><input aria-label={placeholder} value={value} onChange={e=>onChange?.(e.target.value)} onFocus={goToSearch} onClick={goToSearch} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder={placeholder}/>{value && onClear && <button type="button" onClick={onClear} aria-label="Limpar busca" className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X size={18}/></button>}</div>;
}
