"use client";

import { MapPin } from "lucide-react";

export function MapReviewEntryCta({ failed = false, onStart }: { failed?: boolean; onStart: () => void }) {
  return <section className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-6 text-center sm:px-6">
    <MapPin className="mx-auto text-orange-500" size={24} aria-hidden="true"/>
    <h3 className="mt-3 text-lg font-black">{failed ? "Não foi possível concluir a busca." : "Não encontrou o lugar?"}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">{failed ? "Você pode marcar o lugar no mapa e continuar sua avaliação." : "Marque no mapa onde você esteve e conte sua experiência."}</p>
    <button type="button" onClick={onStart} className="mt-5 min-h-12 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white">Avaliar este lugar</button>
  </section>;
}
