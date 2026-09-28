"use client";

import { useRef, useState } from "react";

export function AdminGoogleEnrichment({ restaurantId, linked, onUpdated }: { restaurantId: string; linked: boolean; onUpdated: () => void }) {
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/enrich`, { method: "POST" });
      const result = await response.json() as { google?: string };
      if (!response.ok || result.google === "error") throw new Error("enrichment failed");
      if (result.google === "matched" || result.google === "existing") {
        setMessage("Vínculo confirmado. As fotos disponíveis serão carregadas do Google Maps.");
        onUpdated();
      } else if (result.google === "ambiguous") {
        setMessage("Há mais de um local compatível. Nenhum vínculo foi alterado; é necessária conferência administrativa.");
      } else if (result.google === "unmatched") {
        setMessage("Não encontramos um local com identidade e endereço suficientemente confirmados. Nenhum vínculo foi alterado.");
      } else throw new Error("invalid response");
    } catch {
      setMessage("Não foi possível consultar ou salvar o vínculo com o Google. O restaurante continua aprovado. Tente novamente.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };
  return <section className="rounded-3xl bg-white p-5 shadow-sm">
    <h2 className="font-black">Foto do restaurante no Google</h2>
    <p className="mt-2 text-sm text-stone-600">{linked ? "Vínculo com o Google confirmado. A disponibilidade de fotos depende do Google Maps." : "Sem vínculo confirmado com o Google. Aprovar o restaurante não garante uma foto; a unidade precisa ser identificada com segurança."}</p>
    {!linked && <button type="button" disabled={loading} onClick={() => void refresh()} className="mt-4 min-h-11 rounded-xl bg-stone-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? "Buscando vínculo…" : "Buscar vínculo e foto no Google"}</button>}
    {message && <p role="status" className="mt-3 text-sm text-stone-700">{message}</p>}
  </section>;
}
