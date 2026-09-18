"use client";

import { useState } from "react";
import { michelinLabel } from "@/lib/michelin";
import type { MichelinRecognition, MichelinRecognitionState } from "@/types";

const states: Array<{ value: MichelinRecognitionState; label: string }> = [
  { value: "unknown", label: "Sem informação" },
  { value: "verified_starred", label: "Estrelas confirmadas" },
  { value: "verified_no_star", label: "Ausência de estrelas verificada" },
  { value: "needs_revalidation", label: "Precisa de revalidação" },
];

export function AdminMichelinRecognition({ restaurantId, initialRecognition }: { restaurantId: string; initialRecognition: MichelinRecognition | undefined }) {
  const [recognition, setRecognition] = useState<MichelinRecognition>(initialRecognition ?? { state: "unknown" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; michelin_status: MichelinRecognitionState; michelin_stars: number | null; michelin_edition_year: number | null; changed_at: string }> | null>(null);
  const needsVerification = recognition.state === "verified_starred" || recognition.state === "verified_no_star";
  const update = <K extends keyof MichelinRecognition>(key: K, value: MichelinRecognition[K]) => setRecognition((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/michelin`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(recognition) });
      const payload = await response.json() as { recognition?: MichelinRecognition; error?: string };
      if (!response.ok || !payload.recognition) throw new Error(payload.error ?? "Não foi possível salvar.");
      setRecognition(payload.recognition);
      setMessage("Reconhecimento salvo e registrado no histórico.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar o reconhecimento.");
    } finally {
      setSaving(false);
    }
  };
  const loadHistory = async () => {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}/michelin`, { cache: "no-store" });
      const payload = await response.json() as { history?: typeof history; error?: string };
      if (!response.ok || !payload.history) throw new Error(payload.error ?? "Não foi possível carregar o histórico.");
      setHistory(payload.history);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar o histórico.");
    }
  };

  return <section className="rounded-3xl bg-white p-5 shadow-sm">
    <h2 className="font-black">Reconhecimento Michelin</h2>
    <p className="mt-2 text-sm text-stone-500">Use apenas fonte oficial do Guia Michelin da unidade exata. Este dado não altera a nota GODINNER.</p>
    <label className="mt-4 block text-sm font-bold">Situação<select value={recognition.state} onChange={(event) => update("state", event.target.value as MichelinRecognitionState)} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 font-normal">{states.map((state) => <option key={state.value} value={state.value}>{state.label}</option>)}</select></label>
    {needsVerification && <div className="mt-3 grid gap-3">
      {recognition.state === "verified_starred" && <label className="text-sm font-bold">Quantidade de estrelas<select value={recognition.stars ?? ""} onChange={(event) => update("stars", event.target.value ? Number(event.target.value) as 1 | 2 | 3 : undefined)} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 font-normal"><option value="">Selecione</option><option value="1">1 estrela</option><option value="2">2 estrelas</option><option value="3">3 estrelas</option></select></label>}
      <label className="text-sm font-bold">Edição/ano<input type="number" min="1900" max="2100" value={recognition.editionYear ?? ""} onChange={(event) => update("editionYear", event.target.value ? Number(event.target.value) : undefined)} className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 font-normal" /></label>
      <label className="text-sm font-bold">URL oficial do Guia Michelin<input type="url" value={recognition.sourceUrl ?? ""} onChange={(event) => update("sourceUrl", event.target.value || undefined)} placeholder="https://guide.michelin.com/..." className="mt-1 min-h-11 w-full rounded-xl border bg-white p-3 font-normal" /></label>
    </div>}
    {michelinLabel(recognition) && <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm font-bold">Será exibido: {michelinLabel(recognition)}</p>}
    {message && <p role="status" className={`mt-3 text-sm ${message.startsWith("Reconhecimento") ? "text-emerald-700" : "text-red-700"}`}>{message}</p>}
    <button type="button" onClick={() => void save()} disabled={saving} className="mt-4 min-h-11 rounded-xl bg-stone-950 px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? "Salvando…" : "Salvar reconhecimento"}</button>
    <button type="button" onClick={() => void loadHistory()} className="ml-3 min-h-11 text-sm font-bold text-orange-700 underline underline-offset-4">Ver histórico</button>
    {history && <ol className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">{history.length ? history.map((item) => <li key={item.id}><b>{states.find((state) => state.value === item.michelin_status)?.label}</b>{item.michelin_stars ? ` · ${item.michelin_stars} estrela${item.michelin_stars === 1 ? "" : "s"}` : ""}{item.michelin_edition_year ? ` · edição ${item.michelin_edition_year}` : ""}<small className="block text-stone-500">{new Date(item.changed_at).toLocaleString("pt-BR")}</small></li>) : <li className="text-stone-500">Nenhuma alteração registrada.</li>}</ol>}
  </section>;
}
