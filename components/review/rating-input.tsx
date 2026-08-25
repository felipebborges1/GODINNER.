"use client";

import { Star } from "lucide-react";

export function RatingInput({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number) => void }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl bg-stone-100 px-4 py-3"><span className="text-sm font-bold text-stone-700">{label}</span><div role="radiogroup" aria-label={`Avaliação de ${label}`} className="flex gap-1">{Array.from({ length: 5 }, (_, index) => { const rating = index + 1; const active = rating <= (value ?? 0); return <button key={rating} type="button" role="radio" aria-checked={value === rating} aria-label={`${rating} de 5 para ${label}`} onClick={() => onChange(rating)} className={`grid min-h-10 min-w-10 place-items-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${active ? "text-orange-500" : "text-stone-300 hover:text-orange-300"}`}><Star size={24} fill={active ? "currentColor" : "none"}/></button>; })}</div></div>;
}
