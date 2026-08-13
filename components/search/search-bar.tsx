"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function SearchBar({ placeholder = "Restaurantes, cozinhas ou regiões", navigateOnFocus = false, value, onChange }: { placeholder?: string; navigateOnFocus?: boolean; value?: string; onChange?: (value:string)=>void }) {
  const router = useRouter();
  const goToSearch = () => { if (navigateOnFocus) router.push("/search"); };
  return <label className="flex items-center gap-3 rounded-2xl bg-stone-100 px-4 py-3 text-stone-500"><Search size={20}/><input value={value} onChange={e=>onChange?.(e.target.value)} onFocus={goToSearch} onClick={goToSearch} className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400" placeholder={placeholder}/></label>;
}
